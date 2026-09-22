const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Load existing TypeScript helpers without adding a test framework.
const loaded = new Map()
function load(relative, stubs = {}) {
  const file = path.resolve(__dirname, '..', relative)
  if (loaded.has(file)) return loaded.get(file).exports
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  loaded.set(file, mod)
  mod.require = name => {
    if (Object.hasOwn(stubs, name)) return stubs[name]
    if (name.startsWith('.')) {
      const child = ['.ts', '.tsx'].map(ext => path.resolve(path.dirname(file), name + ext)).find(fs.existsSync)
      if (child) return load(path.relative(path.resolve(__dirname, '..'), child), stubs)
    }
    return Module.prototype.require.call(mod, name)
  }
  mod._compile(compiled, file)
  return mod.exports
}

global.localStorage = { getItem: () => 'zh', setItem() {} }
global.document = { documentElement: { lang: 'zh-CN' } }
const locale = load('src/i18n/detect.ts')
assert.equal(locale.detectLocale(), 'en')
locale.applyLocale('zh', false)
assert.equal(document.documentElement.lang, 'en')

const { TOOL_DEFS, defaultToolChips, chipDisplayLabel } = load('src/lib/toolsCatalog.ts')
const { enPages } = load('src/i18n/locales/en/pages.ts')
assert.equal(defaultToolChips(TOOL_DEFS.find(t => t.id === 'i2p')).mode, '白底图')
assert.equal(defaultToolChips(TOOL_DEFS.find(t => t.id === 'i2i')).strength, '低')
for (const tool of TOOL_DEFS) {
  for (const field of tool.fields) {
    for (const option of field.options || []) assert(!/[\u3400-\u9fff]/u.test(chipDisplayLabel(option, enPages)))
  }
}
const { CATEGORY_ORDER, HOME_CATEGORY_LABELS } = load('src/lib/categories.ts')
assert(CATEGORY_ORDER.includes('科普'))
assert.equal(HOME_CATEGORY_LABELS.All, 'All')
for (const code of CATEGORY_ORDER) assert(!/[\u3400-\u9fff]/u.test(HOME_CATEGORY_LABELS[code] || code))
const duration = load('src/lib/segmentDuration.ts')
assert(duration.NARRATION_PREFIX.startsWith('【Narration'))
assert.equal(duration.sumDuration('@duration:4\nVisual\n@duration:8\nDialogue'), 12)
assert(!/[\u3400-\u9fff]/u.test(duration.validateSegmentScriptDuration('@duration:99\nVisual').message))
const scenes = load('src/pages/drama/outlineScriptPreview.tsx', { '../../components/ui/Modal': () => null })
const script = '### Scene 1-1\nSÁNG INT Sân thượng\nCast: Nguyễn Minh Anh, Mai Lan\nEstablishing Shot: Khu vườn xanh.\nNguyễn Minh Anh (vui): Chúng ta cùng tưới cây.\n\n### Scene 1-2\nCHIỀU EXT Khu vườn\nCast: Mai Lan\n△ Mai Lan mở cổng.'
const blocks = scenes.parseOutlineSceneBlocks(script)
assert.equal(blocks.length, 2)
assert.equal(scenes.joinOutlineSceneBlocks(blocks), script)
assert.deepEqual(scenes.summarizeOutlineScene(blocks[0].body).cast, ['Nguyễn Minh Anh', 'Mai Lan'])
assert.equal(scenes.summarizeOutlineScene(blocks[0].body).location, 'Sân thượng')
assert.equal(scenes.summarizeOutlineScene(blocks[0].body).dialogueCount, 1)
assert.equal(scenes.parseScriptLine('Wide Shot: The garden at dawn.').kind, 'action')
assert.equal(scenes.parseOutlineSceneBlocks('### 场1-1\n日 内 教室\n出场人物：小明\n△ 小明抬头。').length, 1)
const cues = load('src/lib/productionCues.ts')
const subtitles = load('src/lib/dramaSubtitleBoard.ts')
const intro = load('src/lib/dramaCharacterIntro.ts')
const validation = load('src/lib/dramaEpisodeScriptValidate.ts')
const englishScript = `${cues.DRAMA_SUBTITLE_CUE}\n【BGM: Light score; volume below speech】\n【Character intro·on-screen text·beside character】Mai Lan | Gardener\n@duration:4\n${cues.VISUAL_PREFIX}Wide Shot: A rooftop garden.\n@duration:6\n${cues.DIALOGUE_PREFIX}Mai Lan (warm): Khu vườn đã xanh trở lại.`
assert(!/[\u3400-\u9fff]/u.test(englishScript))
assert.deepEqual(validation.validateDramaFragmentScript(englishScript), [])
assert(validation.validateDramaFragmentScript('@duration:6\n【Dialogue·slow and clear】Wide Shot: A garden.').some(issue => issue.level === 'error'))
const board = subtitles.buildDramaSubtitleBoard([{ id: 1, content: englishScript }])
assert.equal(board.length, 1)
assert.equal(board[0].speaker, 'Mai Lan')
assert.equal(board[0].text, 'Khu vườn đã xanh trở lại.')
assert.equal(board[0].startSec, 4)
assert.equal(board[0].endSec, 10)
const stripped = subtitles.stripSubtitlePromptsFromContent(englishScript)
assert(!stripped.includes('Subtitles') && !stripped.includes('synced captions'))
assert(subtitles.applySubtitlePromptsToContent(stripped).includes(cues.DRAMA_SUBTITLE_CUE))
assert(!intro.stripCharacterIntroFromContent(englishScript).includes('Character intro'))
assert(!intro.stripCharacterIntroFromContent('【人物介绍·画面叠字】Mai Lan\n@duration:4\nVisual').includes('人物介绍'))
assert.equal(duration.narrationFromScript('@duration:4\n【Narration·natural pace】Hello there.\n@duration:4\n【旁白·自然语速】Welcome home.'), 'Hello there. Welcome home.')
assert.equal(subtitles.buildDramaSubtitleBoard([{ id: 2, content: '@duration:4\n【旁白·慢速清晰】Xin chào.' }])[0].text, 'Xin chào.')
console.log('English UI, legacy/current production notation, subtitle timing, voice classification and multilingual scenes verified.')
