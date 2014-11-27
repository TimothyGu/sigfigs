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
log = ''

function checkType (inp, prev) {
  if (/[0-9.x]/.test(inp)) {
    return objTypes.NUMBER
  } else if (/[*\/]/.test(inp)) {
    return objTypes.OPERATOR
  } else if (/\(/.test(inp)) {
    return objTypes.OPENPAREN
  } else if (/\)/.test(inp)) {
    return objTypes.CLOSEPAREN
  } else if (/[+\-]/.test(inp)) {
    if (prev === objTypes.NUMBER
     || prev === objTypes.CLOSEPAREN) {
      // '1-1'
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
  // Exact. 20 zeros -> IEEE 754 binary64
  num = num.replace(/([0-9]+)\.?([0-9]+)?x/, '$1.$200000000000000000000')
  var pieces = num.split('.')
  if (pieces.length === 0 || pieces.length > 2) {
    return
    // throw new Error('Error parsing "' + num + '" as a number')
  }
  if (pieces)

  this.type = objTypes.NUMBER

  this.int  = parseInt(pieces[0], 10)
  if (this.int < 0) {
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
  this.val = (this.sign * this.int).toString()
           + (this.accurateInt ? '.' : '') + this.frac

  // Significant figures calculation
  if (this.int === 0) {
    // If the integer part is 0, the # of sigfigs is the length of the
    // fractional part.
    this.sigFigs = this.frac.length
  } else {
    // If not, and if the integer part is not accurate, strip the trailing
    // 0's before calculating significant figures.
    var intPart = this.accurateInt ? intStr : intStr.replace(/0+$/, '')
    // The # of sigfigs is the length of the integer part plus the length of
    // fraction part, if any.
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
    log += ' sigfigs;'
  } else {
    sigFigs = Math.min(a.sigFigs, b.sigFigs)
    log += ' ' + sigFigs + ' sigfigs (' + a.sigFigs + ' vs ' + b.sigFigs + ');'
  }
  if (sigFigs >= num.toFixed().length) {
    var decimalPlaces = sigFigs - num.toFixed().length
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
  var ret = num.toFixed(decPlaces)
  log += ' ' + decPlaces + ' fractional places '
       + '(' + a.frac.length + ' vs ' + b.frac.length + ');'
  if (accurateInt) {
    ret += !decPlaces ? '.' : ''
    ret = new SigFigNum(ret)
    log += ' integer part is guaranteed to be accurate; return ' + ret.val
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
    var sigFigs = String(ret).length - (intDecimalPlaces - 1)
    return roundBySigFigs(+ret, null, null, logger, sigFigs)
  }
}

var ops = {
  '+': function (a, b, logger) {
    var tmpNum = Number(a.val) + Number(b.val)
    log += a.val + ' + ' + b.val + '; vanilla result ' + tmpNum
         + '; addition so round by'
    return roundByDecimalPlaces(tmpNum, a, b, logger)
  }
, '-': function (a, b, logger) {
    var tmpNum = Number(a.val) - Number(b.val)
    log += a.val + ' - ' + b.val + '; vanilla result ' + tmpNum
         + '; subtraction so round by'
    return roundByDecimalPlaces(tmpNum, a, b, logger)
  }
, '*': function (a, b, logger) {
    var tmpNum = Number(a.val) * Number(b.val)
    log += a.val + ' * ' + b.val + '; vanilla result ' + tmpNum
         + '; multiplication so round by'
    return roundBySigFigs(tmpNum, a, b, logger)
  }
, '/': function (a, b, logger) {
    var tmpNum = Number(a.val) / Number(b.val)
    log += a.val + ' / ' + b.val + '; vanilla result ' + tmpNum
         + '; division so round by'
    return roundBySigFigs(tmpNum, a, b, logger)
  }
}

function Parentheses (parent) {
  var arr = makeSubArray()
  arr.val = new SigFigNum('0' /*TODO*/)
  arr.parent = parent || null
  arr.type = objTypes.OPENPAREN
  arr.recalculate = function (logger) {
    var total
    var skip = 0

    // Preemption to make multiplication together
    // for (var i = 1; i < this.length; i++) {
    //   var obj = this[i]
    //   if (obj.type === objTypes.OPERATOR && /[*\/]/.test(obj.op)
    //    && this[i + 2]) {
    //     var newobj = new Parentheses(this)

    //     if (this[i - 1].type === objTypes.OPENPAREN) {
    //       var val = obj.recalculate(logger)
    //     } else if (this[i - 1].type === objTypes.NUMBER) {
    //       var val = obj
    //     } else {
    //       throw new Error('not number or paren')
    //     }
    //     newobj.push(this[i - 1])
    //     newobj.push(obj)
    //     newobj.push(this[i + 1])
    //     this[i - 1] = newobj
    //     this[i].type = objTypes.UNSPECIFIED
    //     this[i + 1].type = objTypes.UNSPECIFIED
    //   }
    // }

    var init = false
    var calculation = []
    var calculating = false
    for (var i = 0; i < this.length; i++) {
      var obj = this[i]
      if (!obj || !obj.type) {
        continue
      }
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
          calculation[0] = obj.op
          calculation[1] = total
          calculating = true
        }
      } else if (obj.type === objTypes.NUMBER) {
        if (!calculating) {
          throw new Error('two numbers together' + i)
        } else {
          total = ops[calculation[0]](calculation[1], obj, logger)
        }
      } else if (obj.type === objTypes.OPENPAREN) {
        if (!calculating) {
          throw new Error('two numbers together' + i)
        } else {
          total = ops[calculation[0]](calculation[1], obj.recalculate(logger), logger)
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
    return {'op': inp, 'type': type}
    break
  }
}

function calculateShell (inp, logger) {
  // Sanitize input of non-numeric-or-operator characters
  inp = (new String(inp)).split('').filter(/./.test.bind(/[0-9.x+\-*\/()]/))

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
  console.log(objs)
  return objs.recalculate(logger)
}

if (typeof module !== 'undefined') {
  module.exports = calculateShell
}