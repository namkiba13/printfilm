const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Load existing TypeScript helpers without adding a test framework.
function load(relative, stubs = {}) {
  const file = path.resolve(__dirname, '..', relative)
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = Module._nodeModulePaths(path.dirname(file))
  mod.require = name => Object.hasOwn(stubs, name) ? stubs[name] : Module.prototype.require.call(mod, name)
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
assert(duration.NARRATION_PREFIX.startsWith('【旁白'))
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
console.log('English UI, canonical parameters, duration grammar and multilingual screenplay scenes verified.')
