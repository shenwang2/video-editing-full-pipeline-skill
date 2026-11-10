#!/usr/bin/env python3
"""Run a configured RunningHub MiniMax H3 video workflow."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:  # Keep a standard-library fallback for minimal Python installs.
    requests = None


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR.parent / "config" / "runninghub.local.json"


class RunningHubError(RuntimeError):
    pass


def load_config(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RunningHubError(f"Config not found: {path}")
    with path.open("r", encoding="utf-8-sig") as handle:
        config = json.load(handle)
    credential_file = str(config.get("credentialConfig") or "").strip()
    if credential_file:
        credential_path = Path(credential_file)
        if not credential_path.is_absolute():
            credential_path = path.parent / credential_path
        if not credential_path.is_file():
            raise RunningHubError(f"Credential config not found: {credential_path}")
        with credential_path.open("r", encoding="utf-8-sig") as handle:
            credentials = json.load(handle)
        for key in ("apiKey", "baseUrl", "instanceType", "pollIntervalSeconds", "timeoutSeconds"):
            if not config.get(key) and credentials.get(key) is not None:
                config[key] = credentials[key]
    for key in ("baseUrl", "workflowId", "nodes"):
        if not config.get(key):
            raise RunningHubError(f"Missing config key: {key}")
    workflow_file = str(config.get("workflowFile") or "").strip()
    if workflow_file:
        workflow_path = Path(workflow_file)
        if not workflow_path.is_absolute():
            workflow_path = path.parent / workflow_path
        if not workflow_path.is_file():
            raise RunningHubError(f"Workflow file not found: {workflow_path}")
        with workflow_path.open("r", encoding="utf-8-sig") as handle:
            workflow = json.load(handle)
        if not isinstance(workflow, dict) or not workflow:
            raise RunningHubError(f"Workflow file is empty or invalid: {workflow_path}")
        validate_workflow_mapping(config, workflow)
        config["_workflowJson"] = json.dumps(
            workflow, ensure_ascii=False, separators=(",", ":")
        )
    return config


def validate_workflow_mapping(config: dict[str, Any], workflow: dict[str, Any]) -> None:
    nodes = config.get("nodes") or {}
    mode = str(config.get("generationMode") or "FL2VA")
    if mode not in {"T2VA", "I2VA", "FL2VA", "L2VA", "Ref2VA"}:
        raise RunningHubError(f"Unsupported generationMode: {mode}")
    expected_task_type = {
        "T2VA": "T2VA",
        "I2VA": "I2VA",
        "L2VA": "L2VA",
        "FL2VA": "FL2VA",
        "Ref2VA": "Ref2VA",
    }[mode]
    conditioning_nodes = [
        node for node in workflow.values()
        if isinstance(node, dict)
        and str(node.get("class_type") or "").startswith("MiniMaxH3AudioConditioning")
    ]
    if len(conditioning_nodes) != 1:
        raise RunningHubError(
            f"Workflow must contain exactly one MiniMax H3 conditioning node, found {len(conditioning_nodes)}"
        )
    native_task_type = str((conditioning_nodes[0].get("inputs") or {}).get("task_type") or "")
    if native_task_type != expected_task_type:
        raise RunningHubError(
            f"Workflow task_type must be {expected_task_type} for {mode}, got: {native_task_type or 'missing'}"
        )
    required = ["duration", "prompt"]
    if mode in {"I2VA", "FL2VA"}:
        required.append("image")
    if mode in {"L2VA", "FL2VA"}:
        required.append("lastImage")
    if mode == "Ref2VA":
        required.extend(("referenceImage", "referenceImage2", "referenceVideo"))
    for name in required:
        mapping = nodes.get(name)
        if not isinstance(mapping, dict) or not mapping.get("nodeId"):
            raise RunningHubError(f"Missing node mapping: {name}")
        node_id = str(mapping["nodeId"])
        workflow_node = workflow.get(node_id)
        if not isinstance(workflow_node, dict):
            raise RunningHubError(f"Configured {name} node does not exist in workflow: {node_id}")
        field_name = str(mapping.get("fieldName") or "")
        inputs = workflow_node.get("inputs") or {}
        if field_name not in inputs:
            raise RunningHubError(
                f"Configured {name} field does not exist: node {node_id}, field {field_name}"
            )

    for name in ("seed", "fps", "aspectRatio"):
        mapping = nodes.get(name)
        if not mapping:
            continue
        if not isinstance(mapping, dict) or not mapping.get("nodeId"):
            raise RunningHubError(f"Invalid optional node mapping: {name}")
        node_id = str(mapping["nodeId"])
        workflow_node = workflow.get(node_id)
        if not isinstance(workflow_node, dict):
            raise RunningHubError(f"Configured {name} node does not exist in workflow: {node_id}")
        field_name = str(mapping.get("fieldName") or "")
        inputs = workflow_node.get("inputs") or {}
        if field_name not in inputs:
            raise RunningHubError(
                f"Configured {name} field does not exist: node {node_id}, field {field_name}"
            )

    aspect_mapping = nodes.get("aspectRatio")
    if not isinstance(aspect_mapping, dict):
        raise RunningHubError("Full-screen H3 workflow requires an aspectRatio node mapping")
    aspect_node = workflow.get(str(aspect_mapping.get("nodeId") or "")) or {}
    native_aspect = str((aspect_node.get("inputs") or {}).get(str(aspect_mapping.get("fieldName") or "")) or "").strip()
    if native_aspect != "16:9 (Widescreen)":
        raise RunningHubError(
            f"Workflow-native aspect ratio must remain 16:9 (Widescreen), got: {native_aspect or 'missing'}"
        )

    if mode == "Ref2VA":
        inputs = conditioning_nodes[0].get("inputs") or {}
        if "first_frame" in inputs or "last_frame" in inputs:
            raise RunningHubError("Ref2VA workflow must use non-endpoint references, not first_frame/last_frame")
        reference_image_fields = sorted(key for key in inputs if key.startswith("ref_images.ref_image_"))
        reference_video_fields = sorted(key for key in inputs if key.startswith("ref_videos.ref_video_"))
        reference_audio_fields = sorted(key for key in inputs if key.startswith("ref_video_audios.ref_video_audio_"))
        if reference_image_fields != ["ref_images.ref_image_0", "ref_images.ref_image_1"]:
            raise RunningHubError(f"Ref2VA workflow must contain exactly two reference-image inputs, got {reference_image_fields}")
        if reference_video_fields != ["ref_videos.ref_video_0"] or reference_audio_fields != ["ref_video_audios.ref_video_audio_0"]:
            raise RunningHubError("Ref2VA workflow must contain exactly one reference video with its audio")
        expected_reference_image = str(nodes["referenceImage"]["nodeId"])
        expected_reference_image_2 = str(nodes["referenceImage2"]["nodeId"])
        expected_reference_video = str(nodes["referenceVideo"]["nodeId"])
        image_link = inputs.get("ref_images.ref_image_0")
        image_link_2 = inputs.get("ref_images.ref_image_1")
        video_link = inputs.get("ref_videos.ref_video_0")
        audio_link = inputs.get("ref_video_audios.ref_video_audio_0")
        if not isinstance(image_link, list) or not image_link or str(image_link[0]) != expected_reference_image:
            raise RunningHubError("Ref2VA ref_image_0 is not linked to the configured reference-image node")
        if not isinstance(image_link_2, list) or not image_link_2 or str(image_link_2[0]) != expected_reference_image_2:
            raise RunningHubError("Ref2VA ref_image_1 is not linked to the configured second reference-image node")
        if (
            not isinstance(video_link, list) or not video_link
            or not isinstance(audio_link, list) or not audio_link
            or str(video_link[0]) != str(audio_link[0])
        ):
            raise RunningHubError("Ref2VA reference video picture and audio must come from one GetVideoComponents node")
        component_node = workflow.get(str(video_link[0])) or {}
        source_link = (component_node.get("inputs") or {}).get("video")
        if not isinstance(source_link, list) or not source_link or str(source_link[0]) != expected_reference_video:
            raise RunningHubError("Ref2VA GetVideoComponents is not linked to the configured reference-video node")

    output = nodes.get("output")
    if output:
        if not isinstance(output, dict) or not output.get("nodeId"):
            raise RunningHubError("Invalid optional node mapping: output")
        node_id = str(output["nodeId"])
        if node_id not in workflow:
            raise RunningHubError(f"Configured output node does not exist in workflow: {node_id}")


def require_api_key(config: dict[str, Any]) -> str:
    key = str(config.get("apiKey") or "").strip()
    if not key:
        raise RunningHubError(
            f'RunningHub API key is empty. Set "apiKey" in {DEFAULT_CONFIG}'
        )
    return key


def request_json(url: str, api_key: str, payload: dict[str, Any]) -> Any:
    if requests is not None:
        try:
            response = requests.post(
                url,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=payload,
                timeout=(15, 120),
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            raise RunningHubError(f"Network error: {exc}") from exc
        except ValueError as exc:
            raise RunningHubError("RunningHub returned invalid JSON.") from exc

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RunningHubError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RunningHubError(f"Network error: {exc.reason}") from exc


def encode_multipart(field_name: str, file_path: Path) -> tuple[bytes, str]:
    boundary = f"----CodexRunningHub{uuid.uuid4().hex}"
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{file_path.name}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return head + file_path.read_bytes() + tail, boundary


def upload_media(base_url: str, api_key: str, media_path: Path) -> str:
    if requests is not None:
        mime = mimetypes.guess_type(media_path.name)[0] or "application/octet-stream"
        try:
            with media_path.open("rb") as handle:
                response = requests.post(
                    f"{base_url}/openapi/v2/media/upload/binary",
                    headers={"Accept": "application/json", "Authorization": f"Bearer {api_key}"},
                    files={"file": (media_path.name, handle, mime)},
                    timeout=(15, 180),
                )
            response.raise_for_status()
            raw = response.json()
        except requests.RequestException as exc:
            raise RunningHubError(f"Media upload failed: {exc}") from exc
        except ValueError as exc:
            raise RunningHubError("Media upload returned invalid JSON.") from exc
        file_name = find_string(raw, ("fileName", "file_name", "filename", "name"))
        if not file_name:
            raise RunningHubError("Upload succeeded but no fileName was found in the response.")
        return file_name

    body, boundary = encode_multipart("file", media_path)
    request = urllib.request.Request(
        f"{base_url}/openapi/v2/media/upload/binary",
        data=body,
        method="POST",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RunningHubError(f"Media upload failed (HTTP {exc.code}): {detail}") from exc
    file_name = find_string(raw, ("fileName", "file_name", "filename", "name"))
    if not file_name:
        raise RunningHubError("Upload succeeded but no fileName was found in the response.")
    return file_name


def find_string(value: Any, keys: tuple[str, ...]) -> str | None:
    if isinstance(value, dict):
        for key in keys:
            item = value.get(key)
            if isinstance(item, str) and item.strip():
                return item.strip()
        for item in value.values():
            found = find_string(item, keys)
            if found:
                return found
    elif isinstance(value, list):
        for item in value:
            found = find_string(item, keys)
            if found:
                return found
    return None


def node_entry(node: dict[str, Any], value: Any) -> dict[str, Any]:
    return {
        "nodeId": str(node["nodeId"]),
        "fieldName": str(node["fieldName"]),
        "fieldValue": value,
    }


def create_task(
    config: dict[str, Any], api_key: str, prompt: str,
    duration: int, seed: int, fps: int,
    first_file_name: str | None = None,
    last_file_name: str | None = None,
    reference_image_file_name: str | None = None,
    reference_image_2_file_name: str | None = None,
    reference_video_file_name: str | None = None,
    aspect_ratio: str | None = None,
) -> tuple[str, Any]:
    nodes = config["nodes"]
    node_info = [
        node_entry(nodes["duration"], duration),
        node_entry(nodes["prompt"], prompt),
    ]
    if first_file_name is not None:
        node_info.append(node_entry(nodes["image"], first_file_name))
    if last_file_name is not None:
        node_info.append(node_entry(nodes["lastImage"], last_file_name))
    if reference_image_file_name is not None:
        node_info.append(node_entry(nodes["referenceImage"], reference_image_file_name))
    if reference_image_2_file_name is not None:
        node_info.append(node_entry(nodes["referenceImage2"], reference_image_2_file_name))
    if reference_video_file_name is not None:
        node_info.append(node_entry(nodes["referenceVideo"], reference_video_file_name))
    if nodes.get("seed"):
        node_info.append(node_entry(nodes["seed"], seed))
    if nodes.get("fps"):
        node_info.append(node_entry(nodes["fps"], fps))
    if nodes.get("aspectRatio") and aspect_ratio:
        node_info.append(node_entry(nodes["aspectRatio"], aspect_ratio))
    payload = {
        "apiKey": api_key,
        "workflowId": str(config["workflowId"]),
        "instanceType": str(config.get("instanceType") or "default"),
        "nodeInfoList": node_info,
    }
    if config.get("_workflowJson"):
        payload["workflow"] = config["_workflowJson"]
    raw = request_json(f'{str(config["baseUrl"]).rstrip("/")}/task/openapi/create', api_key, payload)
    task_id = find_string(raw, ("taskId", "task_id", "id"))
    if not task_id:
        raise RunningHubError(f"Task submission returned no taskId: {safe_summary(raw)}")
    return task_id, raw


def collect_urls(value: Any, preferred_node: str | None = None) -> list[str]:
    preferred: list[str] = []
    fallback: list[str] = []

    def walk(item: Any, current_node: str | None = None) -> None:
        if isinstance(item, dict):
            node = str(item.get("nodeId") or item.get("node_id") or current_node or "")
            for key, child in item.items():
                if isinstance(child, str) and child.startswith(("http://", "https://")):
                    target = preferred if preferred_node and node == preferred_node else fallback
                    if key.lower() in {"fileurl", "file_url", "url", "downloadurl", "download_url"}:
                        target.append(child)
                else:
                    walk(child, node)
        elif isinstance(item, list):
            for child in item:
                walk(child, current_node)

    walk(value)
    candidates = preferred + fallback
    videos = [url for url in candidates if any(ext in urllib.parse.urlparse(url).path.lower() for ext in (".mp4", ".mov", ".webm"))]
    return list(dict.fromkeys(videos or candidates))


def status_text(value: Any) -> str:
    found = find_string(value, ("status", "taskStatus", "state"))
    return found.lower() if found else ""


def safe_summary(value: Any) -> str:
    text = json.dumps(value, ensure_ascii=False)
    return text[:500]


def write_job_record(path: Path | None, updates: dict[str, Any]) -> None:
    if path is None:
        return
    record: dict[str, Any] = {"schemaVersion": 1}
    if path.is_file():
        try:
            with path.open("r", encoding="utf-8-sig") as handle:
                existing = json.load(handle)
            if isinstance(existing, dict):
                record.update(existing)
        except (OSError, ValueError, json.JSONDecodeError):
            pass
    record.update(updates)
    record["updatedAt"] = datetime.now(timezone.utc).isoformat()
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp_path.replace(path)


def wait_for_result(config: dict[str, Any], api_key: str, task_id: str) -> str:
    base_url = str(config["baseUrl"]).rstrip("/")
    interval = max(2.0, float(config.get("pollIntervalSeconds") or 5))
    timeout = max(60.0, float(config.get("timeoutSeconds") or 1200))
    output_mapping = config["nodes"].get("output") or {}
    output_node = str(output_mapping.get("nodeId") or "") or None
    deadline = time.monotonic() + timeout
    failed = {"failed", "failure", "error", "fail", "cancelled", "canceled"}
    while time.monotonic() < deadline:
        raw = request_json(f"{base_url}/openapi/v2/query", api_key, {"taskId": task_id})
        urls = collect_urls(raw, output_node)
        if urls:
            return urls[0]
        status = status_text(raw)
        if status in failed:
            raise RunningHubError(f"Task {task_id} failed: {safe_summary(raw)}")
        print(f"RunningHub task {task_id}: {status or 'running'}", flush=True)
        time.sleep(interval)
    raise RunningHubError(f"Task {task_id} timed out after {int(timeout)} seconds.")


def download_file(url: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if requests is not None:
        try:
            with requests.get(
                url,
                headers={"User-Agent": "Codex/RunningHub-I2V"},
                stream=True,
                timeout=(15, 300),
            ) as response, output_path.open("wb") as handle:
                response.raise_for_status()
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        handle.write(chunk)
        except Exception:
            if output_path.exists():
                output_path.unlink()
            raise
        if output_path.stat().st_size == 0:
            output_path.unlink(missing_ok=True)
            raise RunningHubError("Downloaded output is empty.")
        return

    request = urllib.request.Request(url, headers={"User-Agent": "Codex/RunningHub-I2V"})
    try:
        with urllib.request.urlopen(request, timeout=300) as response, output_path.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
    except Exception:
        if output_path.exists():
            output_path.unlink()
        raise
    if output_path.stat().st_size == 0:
        output_path.unlink(missing_ok=True)
        raise RunningHubError("Downloaded output is empty.")


def resolve_generation_duration(explicit_duration: int | None, bundle_duration: object) -> tuple[int, str]:
    if bundle_duration is not None:
        if not isinstance(bundle_duration, int) or isinstance(bundle_duration, bool):
            raise RunningHubError("Prompt bundle durationSeconds must be an integer.")
        if not 3 <= bundle_duration <= 15:
            raise RunningHubError("Prompt bundle durationSeconds must be between 3 and 15 seconds.")
        if explicit_duration is not None and explicit_duration != bundle_duration:
            raise RunningHubError(
                f"--duration {explicit_duration} conflicts with audited prompt bundle durationSeconds {bundle_duration}."
            )
        return bundle_duration, "prompt-bundle"
    if explicit_duration is None:
        raise RunningHubError(
            "Generation duration is required. Use an audited --prompt-bundle with durationSeconds, "
            "or pass an explicit --duration for a legacy prompt. Workflow config defaults are disabled."
        )
    if not 1 <= explicit_duration <= 30:
        raise RunningHubError("duration must be between 1 and 30 seconds.")
    return explicit_duration, "cli"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, help="First-frame image")
    parser.add_argument("--last-image", type=Path, help="Last-frame image")
    parser.add_argument("--reference-image", type=Path, help="Ref2VA first reference image")
    parser.add_argument("--reference-image-2", type=Path, help="Ref2VA second reference image")
    parser.add_argument("--reference-video", type=Path, help="Ref2VA motion/camera reference video")
    parser.add_argument("--prompt")
    parser.add_argument("--prompt-bundle", type=Path, help="JSON output from build-paper-collage-prompts.py")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--task-id", help="Resume polling an already submitted task")
    parser.add_argument("--job-record", type=Path, help="Persist taskId and task state as JSON")
    parser.add_argument("--duration", type=int)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--fps", type=int)
    parser.add_argument("--aspect-ratio")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_config(args.config.resolve())
    mode = str(config.get("generationMode") or "FL2VA")
    output_path = args.output.resolve()
    job_path = args.job_record.resolve() if args.job_record else None
    if args.task_id:
        api_key = require_api_key(config)
        task_id = str(args.task_id)
        write_job_record(job_path, {"status": "polling", "taskId": task_id, "outputPath": str(output_path)})
        try:
            result_url = wait_for_result(config, api_key, task_id)
            write_job_record(job_path, {"status": "downloading", "taskId": task_id})
            download_file(result_url, output_path)
        except Exception as exc:
            write_job_record(job_path, {"status": "error", "taskId": task_id, "error": str(exc)[:500]})
            raise
        write_job_record(job_path, {"status": "downloaded", "taskId": task_id, "outputPath": str(output_path)})
        print(str(output_path))
        return 0

    if args.prompt and args.prompt_bundle:
        raise RunningHubError("Use either --prompt or --prompt-bundle, not both.")
    prompt = str(args.prompt or "").strip()
    bundle_duration: object = None
    if args.prompt_bundle:
        bundle_path = args.prompt_bundle.resolve()
        if not bundle_path.is_file():
            raise RunningHubError(f"Prompt bundle not found: {bundle_path}")
        with bundle_path.open("r", encoding="utf-8-sig") as handle:
            bundle = json.load(handle)
        if not isinstance(bundle, dict):
            raise RunningHubError("Prompt bundle root must be an object.")
        bundle_mode = str(bundle.get("generationMode") or "").strip()
        if bundle_mode and bundle_mode != mode:
            raise RunningHubError(
                f"Prompt bundle generationMode {bundle_mode} does not match workflow mode {mode}."
            )
        prompt = str(bundle.get("h3Prompt") or bundle.get("motionPrompt") or "").strip()
        if not prompt:
            raise RunningHubError("Prompt bundle does not contain a non-empty h3Prompt or motionPrompt.")
        bundle_duration = bundle.get("durationSeconds")
    if not prompt:
        raise RunningHubError("Either --prompt or --prompt-bundle is required when submitting a new task.")
    needs_first = mode in {"I2VA", "FL2VA"}
    needs_last = mode in {"L2VA", "FL2VA"}
    needs_reference_inputs = mode == "Ref2VA"
    if needs_first and args.image is None:
        raise RunningHubError(f"{mode} requires --image.")
    if needs_last and args.last_image is None:
        raise RunningHubError(f"{mode} requires --last-image.")
    if needs_reference_inputs and args.reference_image is None:
        raise RunningHubError("Ref2VA requires --reference-image.")
    if needs_reference_inputs and args.reference_image_2 is None:
        raise RunningHubError("Ref2VA requires --reference-image-2.")
    if needs_reference_inputs and args.reference_video is None:
        raise RunningHubError("Ref2VA requires --reference-video.")
    image_path = args.image.resolve() if args.image else None
    last_image_path = args.last_image.resolve() if args.last_image else None
    reference_image_path = args.reference_image.resolve() if args.reference_image else None
    reference_image_2_path = args.reference_image_2.resolve() if args.reference_image_2 else None
    reference_video_path = args.reference_video.resolve() if args.reference_video else None
    if image_path is not None and not image_path.is_file():
        raise RunningHubError(f"Image not found: {image_path}")
    if last_image_path is not None and not last_image_path.is_file():
        raise RunningHubError(f"Last image not found: {last_image_path}")
    if reference_image_path is not None and not reference_image_path.is_file():
        raise RunningHubError(f"Reference image not found: {reference_image_path}")
    if reference_image_2_path is not None and not reference_image_2_path.is_file():
        raise RunningHubError(f"Second reference image not found: {reference_image_2_path}")
    if reference_video_path is not None and not reference_video_path.is_file():
        raise RunningHubError(f"Reference video not found: {reference_video_path}")
    defaults = config.get("defaults") or {}
    duration, duration_source = resolve_generation_duration(args.duration, bundle_duration)
    seed = args.seed if args.seed is not None else int(defaults.get("seed", random.randint(0, 2**31 - 1)))
    fps = args.fps if args.fps is not None else int(defaults.get("fps", 24))
    aspect_ratio = str(args.aspect_ratio or defaults.get("aspectRatio") or "").strip() or None
    if not 1 <= fps <= 60:
        raise RunningHubError("fps must be between 1 and 60.")

    if args.dry_run:
        print(json.dumps({
            "workflowId": config["workflowId"],
            "generationMode": mode,
            "firstImage": str(image_path) if image_path else None,
            "lastImage": str(last_image_path) if last_image_path else None,
            "referenceImage": str(reference_image_path) if reference_image_path else None,
            "referenceImage2": str(reference_image_2_path) if reference_image_2_path else None,
            "referenceVideo": str(reference_video_path) if reference_video_path else None,
            "duration": duration,
            "durationSource": duration_source,
            "seed": seed,
            "fps": fps,
            "aspectRatio": aspect_ratio,
            "workflowNativeResolution": True,
            "prompt": prompt,
            "promptBundle": str(args.prompt_bundle.resolve()) if args.prompt_bundle else None,
            "output": str(output_path),
            "nodes": config["nodes"],
            "workflowFileLoaded": bool(config.get("_workflowJson")),
            "jobRecord": str(job_path) if job_path else None,
        }, ensure_ascii=False, indent=2))
        return 0

    api_key = require_api_key(config)
    base_url = str(config["baseUrl"]).rstrip("/")
    write_job_record(job_path, {
        "status": "preparing", "workflowId": str(config["workflowId"]),
        "generationMode": mode,
        "firstImagePath": str(image_path) if image_path else None,
        "lastImagePath": str(last_image_path) if last_image_path else None,
        "referenceImagePath": str(reference_image_path) if reference_image_path else None,
        "referenceImage2Path": str(reference_image_2_path) if reference_image_2_path else None,
        "referenceVideoPath": str(reference_video_path) if reference_video_path else None,
        "outputPath": str(output_path),
        "duration": duration, "durationSource": duration_source,
        "seed": seed, "fps": fps, "aspectRatio": aspect_ratio,
    })
    first_file_name = None
    last_file_name = None
    reference_image_file_name = None
    reference_image_2_file_name = None
    reference_video_file_name = None
    if image_path is not None:
        write_job_record(job_path, {"status": "uploading-first-frame"})
        first_file_name = upload_media(base_url, api_key, image_path)
    if last_image_path is not None:
        write_job_record(job_path, {"status": "uploading-last-frame"})
        last_file_name = upload_media(base_url, api_key, last_image_path)
    if reference_image_path is not None:
        write_job_record(job_path, {"status": "uploading-reference-image"})
        reference_image_file_name = upload_media(base_url, api_key, reference_image_path)
    if reference_image_2_path is not None:
        write_job_record(job_path, {"status": "uploading-reference-image-2"})
        reference_image_2_file_name = upload_media(base_url, api_key, reference_image_2_path)
    if reference_video_path is not None:
        write_job_record(job_path, {"status": "uploading-reference-video"})
        reference_video_file_name = upload_media(base_url, api_key, reference_video_path)
    write_job_record(job_path, {"status": "uploaded"})
    task_id, _ = create_task(
        config, api_key, prompt, duration, seed, fps,
        first_file_name=first_file_name,
        last_file_name=last_file_name,
        reference_image_file_name=reference_image_file_name,
        reference_image_2_file_name=reference_image_2_file_name,
        reference_video_file_name=reference_video_file_name,
        aspect_ratio=aspect_ratio,
    )
    write_job_record(job_path, {"status": "submitted", "taskId": task_id})
    print(f"RunningHub task submitted: {task_id}", flush=True)
    try:
        write_job_record(job_path, {"status": "polling", "taskId": task_id})
        result_url = wait_for_result(config, api_key, task_id)
        write_job_record(job_path, {"status": "downloading", "taskId": task_id})
        download_file(result_url, output_path)
    except Exception as exc:
        write_job_record(job_path, {"status": "error", "taskId": task_id, "error": str(exc)[:500]})
        raise
    write_job_record(job_path, {"status": "downloaded", "taskId": task_id, "outputPath": str(output_path)})
    print(str(output_path))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RunningHubError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
