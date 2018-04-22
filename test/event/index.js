'use strict'

const assert = require('assert')
const test = require('../../lib/test')

const vector = test.Vector()

describe('event', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(10 * 1000)

  it('listens to an event from a contract', vector.it(function (manager) {
    const source = `
      contract Contract {
          event Event(
              address from
          );

          function emit() {
              Event(msg.sender);
          }
      }
    `

    return test.compile(manager, source, 'Contract').then((contract) => {
      let count = 0
      let subscription

      return new Promise((resolve, reject) => {
        contract.Event(
          (error, subscriptionObject) => {
            if (error) {
              reject(error)
            } else {
              subscription = subscriptionObject
            }
          },
          (error, event) => {
            if (error) {
              reject(error)
            } else {
              try {
                assert.equal(event.args.from.length, 40)
              } catch (exception) {
                subscription.stop()
                reject(exception)
              }

              count++

              if (count === 2) {
                subscription.stop()
                resolve()
              }
            }
          })

        contract.emit()
        contract.emit()
      })
    })
  }))
})
