'use strict'

const Promise = require('bluebird')
const fs = require('fs')
const toArabic = require('roman-numerals').toArabic

// References
const refRegexGlobal = /([ivx]+)\.(?:[\,\s])?(Prop|Deff|Def|Ax)?\.?(?:\s)?([ivx]+)\.( of this)?/ig
const refRegexes = [
  /([ivx]+)\.(?:[\,\s]*)?(Prop|Deff|Def|Ax)\.(?:\s)?([ivx]+)\./i,
  /(Prop|Deff|Def|Ax)\.(?:[\,\s]*)?([ivx]+)\.( of this)/i,
  /([ivx]+)\.(?:[\,\s]*)?([ivx]+)\./i,
]

const readFile = name => {
  return Promise.fromCallback(cb => {
    fs.readFile(name, cb)
  })
  .then(buff => buff.toString())
}

const isRomanNumber = c => c.match(/^([IVX]*)\. (.*)/) || c.match(/^PROP\. ([IVX]*)\. (.*)/)
const isPartOfProp = c => c.match(/^ (Proof|Note|Corollary)\./)
const isTitle = c => c.match(/^([A-Z]*)\./)

const getRef = title => {
  const m1 = title.match(refRegexes[0])
  if (m1) {
     return { partNumber: m1[1], type: m1[2], number: m1[3], regex: 1 }
  }
  const m2 = title.match(refRegexes[1])
  if (m2) {
     return { partNumber: 'current', type: m2[1], number: m2[2], regex: 2 }
  }
  const m3 = title.match(refRegexes[2])
  if (m3) {
     return { partNumber: m3[1], type: 'Prop', number: m3[2], regex: 3 }
  }
}

const getPart = (ref, partNumber) => {
  if (ref.partNumber === 'current') return partNumber
  if (ref.partNumber) return toArabic(ref.partNumber)
  return 1
}

const getType = t => {
  if (t.match('/def/i')) return 'Def'
  if (t.match('/ax/i')) return 'Ax'
  return 'P'
}

const convertToId = (title, partNumber, type) => {
  if (type) {
    return 'E' + partNumber + type + toArabic(title)
  }
  const ref = getRef(title)
  const part = getPart(ref, partNumber)
  type = getType(ref.type)
  return 'E' + part + type + toArabic(ref.number)
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
        items.push({ /* title, text,*/ id, references: [] })
        continue
      }
      if (isPartOfProp(currentLine)) {
        // items[items.length - 1].proof = currentLine
        items[items.length - 1].references = items[items.length - 1].references.concat(getReferences(currentLine, partNumber, type))
        continue
      }
      if (currentLine.length === 0) continue
      if (isTitle(currentLine)) break
  }
  return items
}

return Promise.all([
  readFile('./parts/1.md'),
  readFile('./parts/2.md'),
  readFile('./parts/3.md'),
  readFile('./parts/4.md'),
  readFile('./parts/5.md')
])
.map(str => {{
  const titleMatch = str.match(/PART ([IVX]*). ([A-z ]*)/i)
  const title = titleMatch[2]
  const number = toArabic(titleMatch[1])
  // Definitions
  const hasDefinitions = str.match(/DEFINITIONS(?:\.)?\n/)
  let definitions = null
  if (hasDefinitions !== null) {
    let restOfText = str.match(/DEFINITIONS(?:\.)?([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    definitions = getNumberPoints(restOfText, number, 'Def')
  }
  // Axioms
  const hasAxioms = str.match(/AXIOMS(?:\.)?\n/)
  let axioms = []
  if (hasAxioms!== null) {
    let restOfText = str.match(/AXIOMS(?:\.)?([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    axioms = getNumberPoints(restOfText, number, 'Ax')
  }
  // Propositions
  const hasPropositions = str.match(/PROPOSITIONS(?:\.)?\n/)
  let propositions = []
  if (hasAxioms!== null) {
    let restOfText = str.match(/PROPOSITIONS(?:\.)?([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    propositions = getNumberPoints(restOfText, number, 'P')
  }
  return { number, title, definitions: definitions || [], axioms: axioms || [], propositions }
}})
.then(x => JSON.stringify(x))
.then(console.log)
