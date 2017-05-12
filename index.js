'use strict'

const Promise = require('bluebird')
const fs = require('fs')
const toArabic = require('roman-numerals').toArabic

// References
const refRegexGlobal = /([ivx]*) (Prop|Deff|Ax)\. ([ivx]*)\./ig
const refRegex = /([ivx]*) (Prop|Deff|Ax)\. ([ivx]*)\./i

const readFile = name => {
  return Promise.fromCallback(cb => {
    fs.readFile(name, cb)
  })
  .then(buff => buff.toString())
}

const isRomanNumber = c => c.match(/^([IVX]*)\. (.*)/) || c.match(/^PROP\. ([IVX]*)\. (.*)/)
const isProof = c => c.match(/^ Proof\./)
const isTitle = c => c.match(/^([A-Z]*)\./)

const convertToId = (title, partNumber, type) => {
  if (type) {
    return 'E' + partNumber + type + toArabic(title)
  }
  const ref = title.match(refRegex)
  return 'E' + toArabic(ref[1] || 'I') + ref[2] + toArabic(ref[3])
}

const getReferences = (text, partNumber) => {
  let references = text.match(refRegexGlobal)
  if (!references) return []
  references = references.filter(x => !!x)
  if (references.length === 0) return []
  return references.map(r => convertToId(r, partNumber))
}

const getNumberPoints = (text, partNumber, type) => {
  const items = []
  for (let i = 0; i < text.length; i += 1) {
      const currentLine = text[i]
      const match = isRomanNumber(currentLine)
      if (match) {
        // TODO: Remove number from begining
        const title = match[1]
        const text = match[2]
        const id = convertToId(title, partNumber, type)
        items.push({ /* title, text,*/ id })
        continue
      }
      if (isProof(currentLine)) {
        // items[items.length - 1].proof = currentLine
        items[items.length - 1].references = getReferences(currentLine, partNumber, type)
        continue
      }
      if (currentLine.length === 0) continue
      if (isTitle(currentLine)) break
  }
  return items
}

return Promise.all([
  // readFile('./parts/1.md'),
  readFile('./parts/2.md'),
  // readFile('./parts/3.md'),
  // readFile('./parts/4.md'),
  // readFile('./parts/5.md')
])
.map(str => {{
  const titleMatch = str.match(/PART ([IVX]*). ([A-z ]*)/i)
  const title = titleMatch[2]
  const number = toArabic(titleMatch[1])
  // Definitions
  const hasDefinitions = str.match(/DEFINITIONS\./)
  let definitions = null
  if (hasDefinitions !== null) {
    let restOfText = str.match(/DEFINITIONS\.([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    definitions = getNumberPoints(restOfText, number, 'Def')
  }
  // Axioms
  const hasAxioms = str.match(/AXIOMS\./)
  let axioms = []
  if (hasAxioms!== null) {
    let restOfText = str.match(/AXIOMS\.([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    axioms = getNumberPoints(restOfText, number, 'Ax')
  }
  // Propositions
  const hasPropositions = str.match(/PROPOSITIONS\./)
  let propositions = []
  if (hasAxioms!== null) {
    let restOfText = str.match(/PROPOSITIONS\.([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    propositions = getNumberPoints(restOfText, number, 'P')
  }
  return { number, title, definitions: definitions || [], axioms: axioms || [], propositions }
}})
.then(x => JSON.stringify(x))
.then(console.log)
