const fs = require('fs')
const path = require('path')

function displayHelp() {
  console.log(
    `CrossWOZ-RasaNLU Converter
    Usage:
    "node converter intent data/train.json"
    or:
    "node converter table data/database"`
  )
  process.exit(1)
}

function extractIntent(goals) {
  for (const goal of goals) {
    if (goal.length !== 4) continue
    if (goal[0] !== 'Inform') continue
    return goal[1]
  }
  return null
}

function processEntity(content, entity, type) {
  if (
    !entity ||
    !type ||
    entity == '' ||
    type == '' ||
    entity == '是' ||
    entity == '否'
  )
    return content
  if (content.indexOf(entity) === -1) return content
  const splitResult = content.split(entity)
  if (splitResult.length < 2) return content
  if (splitResult[0].endsWith('[')) return content
  let result = `${splitResult[0]}[${entity}](${type})${splitResult[1]}`
  if (!result.endsWith('\n')) result += '\n'
  return result
}

function generateIntentString(content, entities) {
  if (entities && entities.length > 0)
    for (const entity of entities) {
      if (entity.length !== 5) continue
      const type = `${entity[1]}${entity[2]}`
      const data = entity[3]
      if (!data || data === '') continue
      if (typeof data === Array) {
        for (const d of data) {
          if (d && d !== '') {
            content = processEntity(content, d, type)
            break
          }
        }
      } else {
        if (data && data !== '') {
          content = processEntity(content, data, type)
          continue
        }
      }
    }
  return content.endsWith('\n') ? content : content + '\n'
}

function processMessage(content, goals, entities, intentList) {
  if (!content || !goals || !goals || !entities || content === '') return
  const intent = extractIntent(goals)
  if (!intent) return
  const intentString = generateIntentString(content, entities)
  if (!intentString) return
  if (!(intent in intentList)) intentList[intent] = []
  intentList[intent].push(intentString)
}

function convertIntent(intentFile) {
  const filePath = path.resolve(__dirname, intentFile)
  const crossWozData = require(filePath)
  console.log(`Starting convert ${intentFile}...`)
  const intentList = {}
  for (const dialog of Object.values(crossWozData))
    for (const message of dialog.messages) {
      if (!('user_state' in message)) continue
      processMessage(
        message.content,
        message.dialog_act,
        message.user_state,
        intentList
      )
    }
  let result = ''
  for (const intent in intentList) {
    result += `## ${intent}\n`
    for (const str of intentList[intent]) result += str
  }
  fs.writeFileSync(filePath + '.md', result)
}

function convertTable(tableFolder) {}

const argv = process.argv

if (argv.length < 4) displayHelp()

switch (argv[2]) {
  case 'intent':
    convertIntent(argv[3])
    break
  case 'table':
    convertTable(argv[3])
    break
  default:
    displayHelp()
    break
}
