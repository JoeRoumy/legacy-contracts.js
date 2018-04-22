/**
 * @file dev_pipe.js
 * @fileOverview Base class for the dev-pipe.
 * @author Andreas Olofsson
 * @module pipe/dev_pipe
 */
'use strict'

var Pipe = require('./pipe')
var nUtil = require('util')
var config = require('../utils/config')

var ZERO_ADDRESS = '0000000000000000000000000000000000000000'

/**
 * Constructor for the DevPipe class.
 *
 * @type {Pipe}
 */
module.exports = DevPipe

/**
 * DevPipe transacts using the unsafe private-key transactions.
 *
 * @param {*} burrow - the burrow object.
 * @param {string} accounts - the private key to use when sending transactions. NOTE: This means a private key
 * will be passed over the net, so it should only be used when developing, or if it's 100% certain that the
 * Burrow server and this script runs on the same machine, or communication is secure. The recommended way
 * will be to call a signing function on the client side, like in a browser plugin.
 *
 * @constructor
 */
function DevPipe (burrow, accounts) {
  Pipe.call(this, burrow)
  var ad
  // For read-only acccess.
  if (!accounts) {
    ad = _createAccountData()
  } else if (typeof (accounts) === 'string') {
    console.log('DEPRECATED: Do not pass a private key (string) to DevPipe; use the accountData or accountData[] forms.')
    // Interpreted as a private key.
    ad = _createAccountData([{
      address: ZERO_ADDRESS,
      pubKey: '',
      privKey: accounts
    }])
  } else if (accounts instanceof Array) {
    for (var i = 0; i < accounts.length; i++) {
      if (!_checkAccountData(accounts[i])) {
        throw new Error('Account data is not on the proper format: ' + JSON.stringify(accounts[i]))
      }
    }
    ad = _createAccountData(accounts)
  } else {
    if (_checkAccountData(accounts)) {
      ad = _createAccountData([accounts])
    } else {
      throw new Error('Account data is not on the proper format: ' + JSON.stringify(accounts))
    }
  }
  this._accountData = ad
}

nUtil.inherits(DevPipe, Pipe)

/**
 * Used to send a transaction.
 * @param {module:solidity/function~TxPayload} txPayload - The payload object.
 * @param callback - The error-first callback. The 'data' param is a contract address in the case of a
 * create transactions, otherwise it's the return value.
 */
DevPipe.prototype.transact = function (txPayload, callback) {
  var to = txPayload.to
  var from

  if (txPayload.from) {
    var fromAcc = this._accountData.accounts[txPayload.from]
    if (!fromAcc) {
      callback(new Error('No account matches the provided address/ID: ' + txPayload.from))
      return
    }
    from = fromAcc.privKey
  } else {
    var defAcc = this._accountData.default
    if (!defAcc) {
      callback(new Error('No account address provided, and no default account has been set.'))
      return
    }
    from = this._accountData.accounts[defAcc].privKey
  }
  this._burrow.txs().transactAndHold(from, to, txPayload.data, config.DEFAULT_GAS, config.DEFAULT_FEE, null, function (error, data) {
if (error) {
      console.log(error)
      callback(error)
    } else {
      if (to) {
        callback(null, data.return.toUpperCase())
      } else {
        callback(null, data.call_data.callee)
      }
    }
  })
}

/**
 * Used to do a call.
 * @param {module:solidity/function~TxPayload} txPayload - The payload object.
 * @param callback - The error-first callback.
 */
DevPipe.prototype.call = function (txPayload, callback) {
  var address = txPayload.to
  var from = txPayload.from
  if (!from) {
    from = this._accountData.default
  }
  var data = txPayload.data
  if (data.length > 1 && data.slice(0, 2) === '0x') {
    data = data.slice(2)
  }
  this._burrow.txs().call(from, address, data, function (error, data) {
    if (error) {
      callback(error)
    } else {
      callback(null, data.return.toUpperCase())
    }
  })
}

DevPipe.prototype.addAccount = function (accountData) {
  if (this._accountData.accounts[accountData.address]) {
    throw new Error('Account is already registered. Remove the existing account first.')
  }
  this._accountData.accounts[accountData.address] = accountData
}

DevPipe.prototype.removeAccount = function (accountAddress) {
  var acc = this._accountData.accounts[accountAddress]
  if (!acc) {
    throw new Error('Account does not exist.')
  }
  delete this._accountData.accounts[accountAddress]
  if (this._accountData.default.address === accountAddress) {
    this._accountData.default = null
  }
}

DevPipe.prototype.setDefaultAccount = function (accountAddress) {
  var acc = this._accountData.accounts[accountAddress]
  if (!acc) {
    throw new Error('Account does not exist.')
  }
  this._accountData.default = accountAddress
}

DevPipe.prototype.hasAccount = function (accountAddress) {
  return !!this._accountData.accounts[accountAddress]
}

function _createAccountData (accounts) {
  var accountData = {}
  accountData.accounts = {}
  if (accounts && accounts.length > 0) {
    accountData.default = accounts[0].address
    for (var i = 0; i < accounts.length; i++) {
      accountData.accounts[accounts[i].address] = accounts[i]
    }
  }
  return accountData
}

function _checkAccountData (accountData) {
  // TODO more checks if this system becomes permanent.
  if (!accountData.privKey || !accountData.address) {
    return false
  }
  // Allow for the tendermint struct with typed fields (field = [typeNum, hexString]), but drop the type number.
  if (_isTyped(accountData.address)) {
    accountData.address = accountData.address[1]
  }
  if (accountData.pubKey && _isTyped(accountData.pubKey)) {
    accountData.pubKey = accountData.pubKey[1]
  }
  if (_isTyped(accountData.privKey)) {
    accountData.privKey = accountData.privKey[1]
  }
  return true
}

function _isTyped (keyField) {
  return keyField instanceof Array && keyField.length === 2 && typeof (keyField[0]) === 'number' && typeof (keyField[1]) === 'string'
}
