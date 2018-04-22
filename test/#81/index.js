'use strict'

const assert = require('assert')
const test = require('../../lib/test')

const vector = test.Vector()

describe('#81', function () {
  before(vector.before(__dirname, {protocol: 'http:'}))
  after(vector.after())

  this.timeout(10 * 1000)

  it('listens to an event from a contract', vector.it(function (manager) {
    const source = `
      contract Contract {
        event Pay(
          address originator,
          address beneficiary,
          int amount,
          bytes32 servicename,
          bytes32 alias,
          bytes32 providername
        );

        function emit() {
          Pay(
            0x88977A37D05A4FE86D09E88C88A49C2FCF7D6D8F,
            0x721584FA4F1B9F51950018073A8E5ECF47F2D3B8,
            1,
            "Energy",
            "wasmachine",
            "Eneco"
          );
        }
      }
    `

    return test.compile(manager, source, 'Contract').then((contract) => {
      let subscription

      return new Promise((resolve, reject) => {
        contract.Pay(
          (error, subscriptionObject) => {
            if (error) {
              reject(error)
            } else {
              subscription = subscriptionObject
            }
          },
          (error, {args}) => {
            if (error) {
              reject(error)
            } else {
              try {
                const actual = Object.assign(
                  {},
                  args,
                  {amount: Number(args.amount)}
                )

                assert.deepEqual(
                  actual,
                  {
                    originator: '88977A37D05A4FE86D09E88C88A49C2FCF7D6D8F',
                    beneficiary: '721584FA4F1B9F51950018073A8E5ECF47F2D3B8',
                    amount: 1,

                    servicename: '456E65726779000000000000000000000000000000000' +
                      '0000000000000000000',

                    alias: '7761736D616368696E650000000000000000000000000000000' +
                      '0000000000000',

                    providername: '456E65636F0000000000000000000000000000000000' +
                      '00000000000000000000'
                  }
                )
              } catch (exception) {
                reject(exception)
              }

              subscription.stop()
              resolve()
            }
          })

        contract.emit()
      })
    })
  }))
})
