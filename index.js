'use strict'

const Promise = require('bluebird')
const fs = require('fs')

const readFile = name => {
  return Promise.fromCallback(cb => {
    fs.readFile(name, cb)
  })
  .then(buff => buff.toString())
}

const isRomanNumber = c => c.match(/^([IVX]*)\./) || c.match(/^PROP\. ([IVX]*)\./)
const isProof = c => c.match(/^ Proof\./)
const isTitle = c => c.match(/^([A-Z]*)\./)

const getReferences = text => {
  const proofs = text.match(/Prop\. ([ivx]*)\./ig)
  const definitions = text.match(/Deff\. ([ivx]*)\./ig)
  const axioms = text.match(/Ax\. ([ivx]*)\./ig)
  return [].concat(proofs).concat(definitions).concat(axioms)
}

const getNumberPoints = text => {
  const items = []
  for (let i = 0; i < text.length; i += 1) {
      const currentLine = text[i]
      if (isRomanNumber(currentLine)) {
        // TODO: Remove number from begining
        items.push({ text: currentLine })
        continue
      }
      if (isProof(currentLine)) {
        items[items.length - 1].proof = currentLine
        items[items.length - 1].references = getReferences(currentLine)
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
  const title = str.match(/PART ([IVX]*). ([A-z ]*)/i)[2]
  // Definitions
  const hasDefinitions = str.match(/DEFINITIONS\./)
  let definitions = null
  if (hasDefinitions !== null) {
    let restOfText = str.match(/DEFINITIONS\.([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    definitions = getNumberPoints(restOfText)
  }
  // Axioms
  const hasAxioms = str.match(/AXIOMS\./)
  let axioms = []
  if (hasAxioms!== null) {
    let restOfText = str.match(/AXIOMS\.([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    axioms = getNumberPoints(restOfText)
  }
  // Propositions
  const hasPropositions = str.match(/PROPOSITIONS\./)
  let propositions = []
  if (hasAxioms!== null) {
    let restOfText = str.match(/PROPOSITIONS\.([\S\s]*)/)[1]
    restOfText = restOfText.split('\n')
    propositions = getNumberPoints(restOfText)
  }
  return { title, definitions: definitions || [], axioms: axioms || [], propositions }
}})
.then(x => JSON.stringify(x))
.then(console.log)
