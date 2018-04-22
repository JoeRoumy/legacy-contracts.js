/**
 * @file contract.js
 * @author Marek Kotewicz <marek@ethdev.com>
 * @author Andreas Olofsson
 * @date 2014
 * @module contract
 */

const G = require('g-functions')
const generic = require('@nodeguy/generic')
const _ = generic._
const I = require('iteray')
const R = require('ramda')
var utils = require('./utils/utils')
var SolidityEvent = require('web3/lib/web3/event')
var SolidityFunction = require('web3/lib/web3/function')
const is = require('@nodeguy/type').is
var coder = require('web3/lib/solidity/coder')

// TODO remove.
var pipe = null

function ContractManager (pipe) {
  this._pipe = pipe
}

ContractManager.prototype.newContractFactory = function (abi) {
  return new ContractFactory(abi, this._pipe)
}

ContractManager.prototype.pipe = function () {
  return this._pipe
}

ContractManager.prototype.burrow = function () {
  return this._pipe.burrow()
}

// Convert Burrow types to Web3 types.
const burrowToWeb3 = generic.function()

burrowToWeb3.method(_,
  R.identity
)

burrowToWeb3.method([is(Object)],
  G.map(burrowToWeb3)
)

// https://github.com/hyperledger/burrow/blob/ba74718e702cfb781869d5866bd792a38289e8e7/docs/specs/api.md#numbers-and-strings
burrowToWeb3.method([/^[0-9A-F]+$/i],
  ([string]) =>
    '0x' + string
)

// Convert Web3 types to Burrow types.
const web3ToBurrow = generic.function()

web3ToBurrow.method(_,
  R.identity
)

web3ToBurrow.method([is(Object)],
  G.map(web3ToBurrow)
)

// https://github.com/ethereum/wiki/wiki/JSON-RPC#hex-value-encoding
web3ToBurrow.method([/^0x[0-9A-F]*$/i],
  ([hex]) =>
    hex.slice(2)
)

/**
 * Should be called to encode constructor params
 *
 * @method encodeConstructorParams
 * @param {Array} abi
 * @param {Array} params
 */
var encodeConstructorParams = function (abi, params) {
  return abi.filter(function (json) {
    return json.type === 'constructor' && json.inputs.length === params.length
  }).map(function (json) {
    return json.inputs.map(function (input) {
      return input.type
    })
  }).map(function (types) {
    return coder.encodeParams(types, burrowToWeb3(params))
  })[0] || ''
}

const wrapCallback = (callback) =>
  (error, output) =>
    error
      ? callback(error)
      : callback(null, burrowToWeb3(output))

// Wrap our 'pipe' to make it look like web3's 'eth'.
const eth = (pipe) => ({
  call: (callObject, defaultBlock, callback) =>
    pipe.call(web3ToBurrow(callObject), wrapCallback(callback)),

  sendTransaction: (transactionObject, callback) =>
    pipe.transact(web3ToBurrow(transactionObject), wrapCallback(callback))
})

const createFunction = (formatter, pipe, json, address) => {
  const solidityFunction = new SolidityFunction(eth(pipe), json, address)

  const wrapMethod = (name, outputUnpacker = R.identity) =>
    function (...args) {
      const web3Args = burrowToWeb3(args)

      // If there is a callback.
      if ((web3Args.length > 0) && (is(Function, I.get(-1, web3Args)))) {
        const callback = I.get(-1, web3Args)

        const callbackWrapper = (error, output) =>
          error
            ? callback(error)
            : callback(formatter(web3ToBurrow(outputUnpacker(output))))

        return solidityFunction[name](...I.concat(
          I.slice(0, -1, web3Args),
          callbackWrapper
        ))
      } else {
        // Never call the Solidity function in web3's synchronous mode.
        return solidityFunction[name](...web3Args.concat(R.identity))
      }
    }

  const func = {
    call: wrapMethod('call'),

    sendTransaction: wrapMethod(
      'sendTransaction',
      solidityFunction.unpackOutput.bind(solidityFunction)
    )
  }

  Object.setPrototypeOf(func, solidityFunction)
  return func
}

/**
 * Should be called to add functions to contract object
 *
 * @method addFunctionsToContract
 * @param {Contract} contract
 * @param {Array} abi
 * TODO
 * @param {function} pipe - The pipe (added internally).
 * @param {function} outputFormatter - the output formatter (added internally).
 */
var addFunctionsToContract = function (contract, pipe, outputFormatter) {
  contract.abi.filter(function (json) {
    return json.type === 'function'
  }).map(function (json) {
    // Add formatter, or if no formatter exists just pass data through.
    var of = outputFormatter || function (json, output) { return output }

    const formatter = (result) =>
      of(json.outputs, result)

    return createFunction(formatter, pipe, json, contract.address)
  }).forEach(function (f) {
    f.attachToContract(contract)
  })
}

const createEvent = (json, address, pipe) => {
  const solidityEvent = new SolidityEvent(null, json, address)

  const event = {
    /**
     * Should be used to create new Burrow events from events.
     *
     * @method execute
     * @param {function} [startCallback] - error-first callback. The data object is the EventSub. If left out
     * it will not return a sub and will automatically shut the sub down after the first event is received.
     * It is equivalent to but less expressive then calling 'Contract.eventName.once(eventCallback)'.
     * @param {function} eventCallback - error-first callback. The data object is a formatted solidity event.
     * @return {Object} filter object
     */
    execute (startCallback, eventCallback) {
      if (!eventCallback) {
        eventCallback = startCallback
        startCallback = null
      }

      return pipe.eventSub(this._address, startCallback, (error, event) => {
        event = event.EventDataLog
        event = {
          topics: event.Topics,
          address: event.Address,
          data: event.Data,
          height: event.Height
        }

        if (error) {
          eventCallback(error)
        } else {
          // TODO handle anonymous.
          // TODO we don't have filtering in tendermint yet, so I do it here.
          if (event.topics[0].toLowerCase() === this.signature()) {
            let decoded
            let error

            try {
              decoded = this.decode(burrowToWeb3(event))
            } catch (exception) {
              error = exception
            }

            if (error) {
              eventCallback(error)
            } else {
              const converted = Object.assign(
                {},
                decoded,
                {args: web3ToBurrow(decoded.args)}
              )

              eventCallback(null, converted)
            }
          }
        }
      })
    },

    attachToContract (contract) {
      super.attachToContract(contract)

      // Will stop as soon as it receives an event.
      contract[this.displayName()].once = this.execute.bind(this)
    }
  }

  Object.setPrototypeOf(event, solidityEvent)
  return event
}

/**
 * Should be called to add events to contract object
 *
 * @method addEventsToContract
 * @param {Contract} contract
 * @param {Array} abi
 */
var addEventsToContract = function (contract, pipe) {
  contract.abi.filter(function (json) {
    return json.type === 'event'
  }).map(function (json) {
    return createEvent(json, contract.address, pipe)
  }).forEach(function (e) {
    e.attachToContract(contract)
  })
}

/**
 * @deprecated
 */
function contract (abi) {
  console.log("DEPRECATED: Don't use the method 'contractsModule.contracts(abi)', instead use 'contractsModule.newContractManager(pipe)' to get a 'ContractManager' instance, and create factories through 'manager.newContractFactory(abi)")
  return new ContractFactory(abi)
}

/**
 * @deprecated
 */
function init (pipeIn) {
  console.log("DEPRECATED: Only needed for 'contractsModule.contracts(abi)' which should no longer be used.")
  pipe = pipeIn
}

/**
 *
 * @param {Array} abi - The abi object.
 * @param {Object} edbPipe - The Burrow pipe.
 * @constructor
 */
var ContractFactory = function (abi, edbPipe) {
  this.abi = abi
  if (!edbPipe) {
    this._pipe = pipe
  } else {
    this._pipe = edbPipe
  }
}

/**
 * Should be called to create new contract on a blockchain
 *
 * @method new
 * @param {*} [contract] constructor param1 (optional)
 * @param {*} [contract] constructor param2 (optional)
 * @param {Object} contract transaction object (required)
 * @param {Function} callback
 */
ContractFactory.prototype.new = function () {
  // parse arguments
  var options = {} // required!
  var callback

  var args = Array.prototype.slice.call(arguments)
  if (utils.isFunction(args[args.length - 1])) {
    callback = args.pop()
  }

  var last = args[args.length - 1]
  if (utils.isObject(last) && !utils.isArray(last)) {
    options = args.pop()
  }
  if (!options.hasOwnProperty('data')) {
    options.data = ''
  }
  if (!options.hasOwnProperty('to')) {
    options.to = ''
  }
  try {
    // throw an error if there are no options
    options.data += encodeConstructorParams(this.abi, args)

    var that = this

    this._pipe.transact(options, function (error, address) {
      if (error) { callback(error) } else {
        that.at(address, callback)
      }
    })
  } catch (error) {
    callback(error)
  }
}

/**
 * Should be called to get access to existing contract on a blockchain
 *
 * @method at
 * @param {string} address - contract address
 * @param {Function} [callback] - optional callback.
 * @returns {Contract} returns contract if no callback was passed,
 * otherwise calls callback function (err, contract)
 */
ContractFactory.prototype.at = function (address, callback) {
  var of = this._outputFormatter || function (outputData, output) { return output }
  var contractAt = new Contract(this.abi, address, this._pipe, of)
  if (!callback) {
    return contractAt
  } else {
    callback(null, contractAt)
  }
}

ContractFactory.prototype.setOutputFormatter = function (outputFormatter) {
  this._outputFormatter = outputFormatter
}

/**
 * The contract type. This class is instantiated internally through the factory.
 *
 * @method Contract
 * @param {Array} abi
 * @param {string} address
 * @param {pipe} pipe;
 * @param {Function} outputFormatter - the output formatter.
 */
var Contract = function (abi, address, pipe, outputFormatter) {
  this.address = address
  // TODO avoid conflict somehow.
  this.abi = abi
  addFunctionsToContract(this, pipe, outputFormatter)
  addEventsToContract(this, pipe)
}

exports.contract = contract
exports.init = init

exports.newContractManager = function (pipe) {
  return new ContractManager(pipe)
}

exports.getPipe = function () {
  return pipe
}
