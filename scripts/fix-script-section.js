const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'CollaboratorManager.vue')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Add copyText function and update loadAccounts
// Find loadAccounts function
const loadAccountsFn = content.indexOf('async function loadAccounts()')
if (loadAccountsFn === -1) { console.error('loadAccounts not found'); process.exit(1) }

// Find the function start and the try block
const tryBlock = content.indexOf('try {', loadAccountsFn)
const catchBlock = content.indexOf('catch {', tryBlock)
const finallyBlock = content.indexOf('finally {', catchBlock)

if (tryBlock === -1 || catchBlock === -1 || finallyBlock === -1) {
  console.error('Cannot find blocks in loadAccounts'); process.exit(1)
}

const beforeFn = content.substring(0, loadAccountsFn)
const afterFn = content.substring(finallyBlock + 'finally {'.length)

// Find the end of the finally block (the closing })
let depth = 1
let fnEnd = afterFn.indexOf('{') - 1 // should be right after finally {

// Actually, let's find where the function ends by counting braces
let idx = 0
depth = 0
let inString = false
let char
while (idx < afterFn.length) {
  char = afterFn[idx]
  if (char === '"' || char === "'" || char === '`') {
    const quote = char
    idx++
    while (idx < afterFn.length && afterFn[idx] !== quote) {
      if (afterFn[idx] === '\\') idx++
      idx++
    }
    idx++
    continue
  }
  if (char === '{') depth++
  if (char === '}') {
    depth--
    if (depth === 0) break
  }
  idx++
}
fnEnd = idx + 1

const restOfFn = afterFn.substring(0, fnEnd)
const restAfterFn = afterFn.substring(fnEnd)

const replacement = `
function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}

async function loadAccounts() {
  accountsLoading.value = true
  accountsError.value = null
  try {
    accounts.value = await listAccounts(props.publicationId)
    aliveAccounts.value = accounts.value.filter(p => !p.deceased).length
  } catch {
    accounts.value = []
  } finally {
    accountsLoading.value = false
  }
}
`

content = beforeFn + replacement + restAfterFn
fs.writeFileSync(filePath, content, 'utf8')
console.log('OK: loadAccounts updated + copyText added')
