'use strict'

const contractsModule = require('./contractManager')
const DevPipe = require('./pipes/dev_pipe')
const Promise = require('bluebird')
const Solidity = require('solc')
const test = require('@monax/legacy-db/lib/test')

// Convenience function to compile Solidity code in tests.
const compile = (contractManager, source, name) => {
  const compiled = Solidity.compile(source, 1)

  if (compiled.errors) {
    return Promise.reject(new Error(compiled.errors))
  } else {
    const contract = compiled.contracts[name]
    const abi = JSON.parse(contract.interface)
    const contractFactory = contractManager.newContractFactory(abi)

    return Promise.fromCallback((callback) =>
      contractFactory.new({data: contract.bytecode}, callback)
    )
  }
}

// Return a contract manager in the test harness.
const Vector = () => {
  let manager
  const vector = test.Vector()

  return Object.assign(Object.create(vector), {
    before: (dirname, options, callback) =>
      vector.before(dirname, options, function ({db, account}) {
        manager = contractsModule.newContractManager(new DevPipe(db, account))
        if (callback) {
          return callback.call(this, manager)
        }
      }),

    it: (callback) =>
      vector.it(
        function () {
          return callback.call(this, manager)
        }
      )
  })
}

module.exports = {
  compile,
  Vector
}
