/*
 * Significant figures-sensitive calculator.
 *
 * Copyright (c) 2014 Tiancheng "Timothy" Gu <timothygu99@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// From https://github.com/kangax/array_subclassing/blob/master/subarray.js
// by @kangax (Juriy Zaytsev).
var makeSubArray = (function () {
  var MAX_SIGNED_INT_VALUE = Math.pow(2, 32) - 1
  , hasOwnProperty = Object.prototype.hasOwnProperty

  function ToUint32 (value) {
    return value >>> 0
  }

  function getMaxIndexProperty (object) {
    var maxIndex = -1, isValidProperty

    for (var prop in object) {

      isValidProperty = (
        String(ToUint32(prop)) === prop &&
        ToUint32(prop) !== MAX_SIGNED_INT_VALUE &&
        hasOwnProperty.call(object, prop))

      if (isValidProperty && prop > maxIndex) {
        maxIndex = prop
      }
    }
    return maxIndex
  }

  return function (methods) {
    var length = 0
    methods = methods || {}

    methods.length = {
      get: function () {
        var maxIndexProperty = +getMaxIndexProperty(this)
        return Math.max(length, maxIndexProperty + 1)
      }
    , set: function (value) {
        var constrainedValue = ToUint32(value)
        if (constrainedValue !== +value) {
          throw new RangeError()
        }
        for (var i = constrainedValue, len = this.length; i < len; i++) {
          delete this[i]
        }
        length = constrainedValue
      }
    }
    methods.toString = {
      value: Array.prototype.join
    }
    return Object.create(Array.prototype, methods)
  }
})()

var objTypes = Object.freeze({
  UNSPECIFIED: 0
, NUMBER     : 1
, OPERATOR   : 2
, OPENPAREN  : 3
, CLOSEPAREN : 4
})

// Global variable yay!
var log = ''

function checkType (inp, prev) {
  if (/[0-9.x]/.test(inp)) {
    return objTypes.NUMBER
  } else if (/[*\/×÷]/.test(inp)) {
    return objTypes.OPERATOR
  } else if (/[{\[(]/.test(inp)) {
    return objTypes.OPENPAREN
  } else if (/[)\]}]/.test(inp)) {
    return objTypes.CLOSEPAREN
  } else if (/[+\-]/.test(inp)) {
    if (prev === objTypes.NUMBER
     || prev === objTypes.CLOSEPAREN) {
      // '1-1'
      // ')-1'
      return objTypes.OPERATOR
    } else {
      // '(-23)'
      // '-23'
      // '/-23'
      return objTypes.NUMBER
    }
  }
}

function SigFigNum (num) {
  if (!num) return

  // Exact. 20 zeros -> IEEE 754 binary64
  num = num.replace(/([0-9]+)\.?([0-9]+)?x/, '$1.$200000000000000000000')
  var pieces = num.split('.')
  if (pieces.length === 0 || pieces.length > 2) {
    return
    // throw new Error('Error parsing "' + num + '" as a number')
  }

  this.type = objTypes.NUMBER

  var numNum = Number(num)
  this.int  = parseInt(pieces[0], /*radix*/10)
  if (numNum < 0) {
    this.sign = -1
    this.int  = -this.int
  } else {
    this.sign = 1
  }
  var intStr = String(this.int)

  this.accurateInt = false
  if (pieces.length === 2) {
    // If the number is '3000.', the # of sigfigs should be 4 instead of 1.
    // Use accurateInt as a flag to show this.
    // If there is a fractional part, accurateInt is true anyway.
    this.accurateInt = true
    this.frac = pieces[1]
  } else {
    if (intStr.length === intStr.replace(/0+$/, '')) {
      this.accurateInt = true
    }
    this.frac = ''
  }
  // Can't use num here because we want to remove the leading zeros, if any.
  // Can't do 'String(this.sign * this.int) because for '-0.8' this.int is 0
  this.val = (this.sign < 0 ? '-' : '') + String(this.int)
           + (this.accurateInt ? '.' : '') + this.frac

  // Significant figures calculation
  if (this.int === 0) {
    // If the integer part is 0, the # of sigfigs is the length of the
    // fractional part not counting leading zeros.
    this.sigFigs = this.frac.replace(/^0+/, '').length
  } else {
    // If not, and if the integer part is not accurate, strip the trailing
    // 0's before calculating significant figures.
    var intPart = this.accurateInt ? intStr : intStr.replace(/0+$/, '')
    // The # of sigfigs is the length of the integer part plus the length of
    // fraction part.
    this.sigFigs = intPart.length + this.frac.length
  }
  // Expressed in the exponent of 10
  // 6331200 -> 3; 0.912 -> 1; 1000 -> 1; 12012 -> 1
  this.mostAccurateIntPlace = (this.accurateInt || this.int === 0)
                            ? 1
                            : intStr.length - this.sigFigs + 1
}

function roundBySigFigs (num, a, b, logger, sigFigs) {
  if (sigFigs) {
    log += ' ' + sigFigs + ' sigfigs;'
  } else {
    sigFigs = Math.min(a.sigFigs, b.sigFigs)
    log += ' ' + sigFigs + ' sigfigs (' + a.sigFigs + ' vs ' + b.sigFigs + ');'
  }
  if (sigFigs >= num.toFixed().length) {

    if (num === 0) {
      // If a number is 0, there is one integer place.
      // This must be the first because it is an exception to the following
      // conditional, which is an exception to the following following rule.
      var intPlaces = 1
    } else {
      var intPlaces = Math.floor(Math.log(Math.abs(num)) / Math.LN10) + 1
    }
    var decimalPlaces = sigFigs - intPlaces
    var str = num.toFixed(decimalPlaces)
  } else if (sigFigs === num.toFixed().length) {
    var str = num.toFixed() + '.'
  } else {
    // The String(Number()) is necessary because toPrecision() sometimes
    // returns an exponential number ('1.2e5').
    var str = String(Number(num.toPrecision(sigFigs)))
  }
  var ret = new SigFigNum(str)
  log += ' return ' + ret.val
  logger(log)
  log = ''
  return ret
}

function roundByDecimalPlaces (num, a, b, logger) {
  var accurateInt = a.accurateInt && b.accurateInt
  var decPlaces = Math.min(a.frac.length, b.frac.length)
  log += ' ' + decPlaces + ' fractional places '
       + '(' + a.frac.length + ' vs ' + b.frac.length + ');'
  if (accurateInt) {
    ret = new SigFigNum(num.toFixed(decPlaces) + (!decPlaces ? '.' : ''))
    log += ' both integer parts are guaranteed to be accurate; return '
         + ret.val
    logger(log)
    log = ''
    return ret
  } else {
    var intDecimalPlaces = Math.max(a.mostAccurateIntPlace,
                                    b.mostAccurateIntPlace)
    log += ' no fractional part so round by 10^' + (intDecimalPlaces - 1)
         + ' intervals ('
         + (a.mostAccurateIntPlace - 1) + ' vs '
         + (b.mostAccurateIntPlace - 1) + ') using'
    var sigFigs = Math.abs(num).toFixed(decPlaces).length
                - (intDecimalPlaces - 1)
    return roundBySigFigs(num, null, null, logger, sigFigs)
  }
}

var ops = {
  '+': function (a, b, logger) {
    var tmpNum = Number(a.val) + Number(b.val)
    log += a.val + ' + ' + b.val + '; arithmetic result ' + tmpNum
         + '; addition so round by'
    return roundByDecimalPlaces(tmpNum, a, b, logger)
  }
, '-': function (a, b, logger) {
    var tmpNum = Number(a.val) - Number(b.val)
    log += a.val + ' - ' + b.val + '; arithmetic result ' + tmpNum
         + '; subtraction so round by'
    return roundByDecimalPlaces(tmpNum, a, b, logger)
  }
, '*': function (a, b, logger) {
    var tmpNum = Number(a.val) * Number(b.val)
    log += a.val + ' × ' + b.val + '; arithmetic result ' + tmpNum
         + '; multiplication so round by'
    return roundBySigFigs(tmpNum, a, b, logger)
  }
, '/': function (a, b, logger) {
    var tmpNum = Number(a.val) / Number(b.val)
    log += a.val + ' ÷ ' + b.val + '; arithmetic result ' + tmpNum
         + '; division so round by'
    return roundBySigFigs(tmpNum, a, b, logger)
  }
}

function Operation (operator) {
  if (!operator) return
  switch (operator) {
  case '×':
    operator = '*'
    break
  case '÷':
    operator = '/'
    break
  }
  this.op = operator
  this.type = objTypes.OPERATOR
  this.arguments = new Array(2)
}

function Parentheses (parent) {
  var arr = makeSubArray()
  arr.val = new SigFigNum('0' /*TODO*/)
  arr.parent = parent || null
  arr.type = objTypes.OPENPAREN
  arr.recalculate = function (logger) {
    var total
    var skip = 0

    // Preemption to group multiplication together
    if (!this.grouped) {
      for (var i = 1; i < this.length; i++) {
        var obj = this[i]
        if (!obj || !obj.type || !this[i - 1]) continue
        if (obj.type === objTypes.OPERATOR && /[*\/]/.test(obj.op)
         && this[i + 1]) {
          var newobj = new Parentheses(this)
          newobj.grouped = true

          // Flatten the parentheses as cloning objects with circulars is a
          // pain.
          if (this[i - 1].type === objTypes.OPENPAREN) {
            var val1 = this[i - 1].recalculate(logger)
          } else if (this[i - 1].type === objTypes.NUMBER) {
            var val1 = this[i - 1]
          } else {
            throw new Error('First operand not number or paren')
          }
          if (this[i + 1].type === objTypes.OPENPAREN) {
            var val2 = this[i + 1].recalculate(logger)
          } else if (this[i + 1].type === objTypes.NUMBER) {
            var val2 = this[i + 1]
          } else {
            throw new Error('Second operand not number or paren')
          }
          newobj.push(val1)
          newobj.push(JSON.parse(JSON.stringify(obj)))
          newobj.push(val2)
          this[i - 1] = newobj
          this[i    ] = null
          this[i + 1] = null
        }
      }
    }

    var init = false
    var calculation = ''
    var calculating = false
    for (var i = 0; i < this.length; i++) {
      var obj = this[i]
      if (!obj || !obj.type) continue
      if (!init) {
        if (obj.type === objTypes.NUMBER) {
          total = JSON.parse(JSON.stringify(obj))
        } else if (obj.type === objTypes.OPERATOR) {
          throw new Error('bad calc')
        } else if (obj.type === objTypes.OPENPAREN) {
          total = obj.recalculate(logger)
        }
        init = true
        continue
      }
      if (obj.type === objTypes.OPERATOR) {
        if (!this[i + 1]) {
          throw new Error('bad calc')
        } else {
          calculation = obj.op
          calculating = true
        }
      } else if (obj.type === objTypes.NUMBER) {
        if (!calculating) {
          throw new Error('two numbers together' + i)
        } else {
          total = ops[calculation](total, obj, logger)
        }
      } else if (obj.type === objTypes.OPENPAREN) {
        obj.recalculate(logger)
        if (!calculating) {
          throw new Error('two numbers together' + i)
        } else {
          total = ops[calculation](total, obj.val, logger)
        }
      }
    }
    this.val = total
    return this.val
  }
  return arr
}

function newObj (inp, type) {
  switch (type) {
  case objTypes.NUMBER:
    return new SigFigNum(inp)
    break
  case objTypes.OPERATOR:
    return new Operation(inp)
    break
  }
}

function cleanInput (inp) {
  // Sanitize input of non-numeric-or-operator characters
  return inp.split('').filter(/./.test.bind(/[0-9.x+\-*\/×÷{\[()\]}]/))
}

function calculate (inp, logger) {
  inp = cleanInput(inp)

  var tmp = ''
  var objs = new Parentheses()
  var curobjs = objs
  var prevType = objTypes.UNSPECIFIED
  function flushInputNumber () {
    curobjs.push(newObj(tmp, prevType))
  }
  for (var i = 0; i < inp.length; i ++) {
    var type = checkType(inp[i], prevType)
    if (type !== prevType) {
      if (type === objTypes.CLOSEPAREN) {
        flushInputNumber()
        if (!curobjs.parent) {
          throw new Error('bad parentheses')
        } else {
          curobjs = curobjs.parent
        }
      } else if (type === objTypes.OPENPAREN) {
        if (prevType === objTypes.NUMBER
         || prevType === objTypes.OPERATOR) {
          flushInputNumber()
        }
        curobjs.push(new Parentheses(curobjs))
        curobjs = curobjs[curobjs.length - 1]
      } else if (prevType !== objTypes.UNSPECIFIED
              && prevType !== objTypes.CLOSEPAREN) {
        curobjs.push(newObj(tmp, prevType))
      }
      tmp = inp[i]
    } else {
      tmp += inp[i]
    }
    prevType = type
  }
  if (prevType === objTypes.NUMBER) {
    flushInputNumber()
  }

  while (curobjs !== objs) {
    curobjs.recalculate(logger)
    curobjs = curobjs.parent
  }
  return objs.recalculate(logger)
}

if (typeof module !== 'undefined') {
  module.exports = calculate
}
