"""English UI notation must round-trip without changing dialogue, timing or stored data."""

from copy import deepcopy
import re

from app.api.admin.drama_fragments import AdminDramaFragmentOut
from app.schemas import ShotOut, ShotUpdate
from app.schemas_drama import DramaAssetOut, DramaFragmentOut, DramaFragmentSaveItem
from app.schemas_tasks import TaskStepCreate, TaskStepOut
from app.services.seedance_segments import narration_from_script, script_has_dialogue_cue, script_has_visual_only_cue, sum_duration
from app.services.system_text import canonical_system_text, english_system_text


LEGACY_SCRIPT = (
    "【BGM：贴合剧情氛围的轻量配乐，情绪随画面起伏；音量低于人声】\n"
    "【人物介绍·画面叠字·角色身旁】Mai Lan | Người làm vườn\n"
    "@duration:4\n【画面·无配音仅环境音】Wide Shot: A rooftop garden.\n"
    "@duration:6\n【对白·慢速清晰】@asset:12 Mai Lan: Khu vườn đã xanh trở lại.\n"
    "@duration:4\n【旁白·自然语速·同步字幕】Xin chào, mọi người."
)


def test_fragment_user_and_admin_views_are_english_and_editable():
    """Both views translate system text; saving restores identical production semantics."""
    user = DramaFragmentOut(id=1, episode_id=2, sort_order=0, content=LEGACY_SCRIPT)
    admin = AdminDramaFragmentOut(id=1, episode_id=2, project_id=3, content=LEGACY_SCRIPT)
    assert user.content == admin.content
    assert not re.search(r"[\u3400-\u9fff]", user.content)
    assert "【Visual·ambient sound only, no voiceover】" in user.content
    assert "【Dialogue·slow and clear】" in user.content
    assert "Khu vườn đã xanh trở lại." in user.content
    assert "@asset:12" in user.content
    saved = DramaFragmentSaveItem(content=user.content)
    assert saved.content == LEGACY_SCRIPT
    assert sum_duration(saved.content) == 14
    assert script_has_dialogue_cue(saved.content)
    assert script_has_visual_only_cue(saved.content)
    assert narration_from_script(saved.content) == "Xin chào, mọi người."
    assert english_system_text(user.content) == user.content
    assert canonical_system_text(saved.content) == saved.content


def test_nested_asset_formatting_does_not_mutate_source_or_story_prose():
    """Formatting is copy-only and does not translate an author's original Chinese text."""
    params = {"canvas": {"appearanceName": "基础形象", "prompt": LEGACY_SCRIPT}, "voicePrompt": "Giọng nữ ấm áp.", "source": "【旁白】这是用户原文", "dialogue": "这是用户写的对白"}
    before = deepcopy(params)
    asset = DramaAssetOut(id=1, type="character", asset_type="image", project_id=3, params=params)
    assert params == before
    assert asset.params["canvas"]["appearanceName"] == "Base appearance"
    assert asset.params["canvas"]["prompt"] != LEGACY_SCRIPT
    assert asset.params["source"] == before["source"]
    assert asset.params["dialogue"] == before["dialogue"]
    assert canonical_system_text(asset.params) == before


def test_shot_defaults_and_scripts_round_trip():
    """Short-video editor uses English labels while its generation inputs stay compatible."""
    shot = ShotOut(id=1, shot_no=1, duration=14, narration="Xin chào.", img_prompt="A garden.", video_prompt=LEGACY_SCRIPT, segment_script=LEGACY_SCRIPT, camera="缓慢横移", bgm_mood="平稳", image_url=None, video_url=None, audio_url=None, status="pending", version=1)
    assert shot.camera == "Slow pan" and shot.bgm_mood == "Steady"
    assert not re.search(r"[\u3400-\u9fff]", shot.segment_script)
    saved = ShotUpdate(segment_script=shot.segment_script, camera=shot.camera, bgm_mood=shot.bgm_mood)
    assert saved.segment_script == LEGACY_SCRIPT
    assert saved.camera == "缓慢横移" and saved.bgm_mood == "平稳"


def test_task_details_and_freeform_music_are_not_mixed_language():
    step = TaskStepOut(id=1, step_key="video", step_type="job", status="queued", input_payload={"prompt": LEGACY_SCRIPT})
    assert not re.search(r"[\u3400-\u9fff]", step.input_payload["prompt"])
    restored = TaskStepCreate(step_key="video", step_type="job", input_payload=step.input_payload)
    assert restored.input_payload["prompt"] == LEGACY_SCRIPT
    assert english_system_text("【BGM：温暖而忧伤的旋律】") == "【BGM: 温暖而忧伤的旋律】"
    assert english_system_text("【BGM：平稳，音量低于人声】") == "【BGM: Steady，volume below speech】"
