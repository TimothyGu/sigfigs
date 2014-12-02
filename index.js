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
  if (sigFigs != null) {
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
    var str = num.toFixed(Math.min(decimalPlaces, 20))
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
  var decPlaces = Math.min(Math.min(a.frac.length, b.frac.length), 20)
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
    var sigFigs = Math.max(Math.abs(num).toFixed(decPlaces).length
                          - (intDecimalPlaces - 1), 1)
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

function Operation (parent, operator) {
  this.op = operator || ''
  this.type = objTypes.OPERATOR
  this.operand = new Array(2)
  this.parent = parent
  this.val = new SigFigNum('0')
  this.calculate = function calculate (logger) {
    switch (this.op) {
    case '×':
      this.op = '*'
      break
    case '÷':
      this.op = '/'
      break
    }
    var val1, val2
    if (this.operand[0].type === objTypes.OPERATOR) {
      val1 = this.operand[0].calculate(logger)
    } else {
      val1 = this.operand[0]
    }
    if (this.operand[1].type === objTypes.OPERATOR) {
      val2 = this.operand[1].calculate(logger)
    } else {
      val2 = this.operand[1]
    }
    this.val = ops[this.op](val1, val2, logger)
    return this.val
  }
}

function compareOperators (oldop, newop) {
  function getMerit (op) {
    if (/[*\/]/.test(op)) return 1
    else                  return 0
  }
  if (getMerit(oldop) >= getMerit(newop)) return 0
  else                                    return 1
}

function cleanInput (inp) {
  // Sanitize input of non-numeric-or-operator characters
  return inp.split('').filter(/./.test.bind(/[0-9.x+\-*\/×÷{\[()\]}]/))
}

function calculate (inp, logger) {
  inp = cleanInput(inp)
  log = ''

  var tmp = ''
  var objs = new Operation(null)
  var parent = objs
  var prevType = objTypes.UNSPECIFIED
  function flushInputNumber () {
    if (objs.op === '') {
      // _
      // 1 + 2 + 3
      objs.operand[0] = new SigFigNum(tmp)
    } else {
      if (!objs.operand[1]){
        //     _
        // 1 + 2 + 3
        objs.operand[1] = new SigFigNum(tmp)
      } else {
        //           _
        // (1 + 2) + 3
        throw new Error('should not happen')
      }
    }
  }
  function flushInputOperator () {
    if (objs.op === '') objs.op = tmp
    else {
      if (!objs.operand[1]) {
        //     _
        // 1 + + 2
        throw new Error('two ops together')
      } else {
        //       _
        // 1 + 2 + 3
        // We can simply just do 
        // (1 + 2) + 3
        //       3 + 3
        // But using this as a learning experience.
        var newobj = new Operation(null, tmp)
        newobj.index = objs.index
        var opcomp = compareOperators(objs.op, tmp)
        if (!opcomp) {
          //       _
          // 1 + 2 + 3

          // TODO: factor this out
          if (objs.implicit) {
            //           _
            // 1 + 2 * 3 + 1
            objs.implicit = false
            objs = objs.parent
          }
          newobj.operand[0] = objs
          newobj.parent = objs.parent
          objs.parent = newobj
          objs.index = 0
          objs = newobj
          if (newobj.parent === null) parent = newobj
          else if (newobj.index != null){
            newobj.parent.operand[newobj.index] = newobj
          }
        } else {
          //       _
          // 1 + 2 * 3
          newobj.operand[0] = objs.operand[1]
          newobj.parent = objs
          newobj.implicit = true
          objs.operand[1] = newobj
          objs.index = 1

          objs = newobj
        }
      }
    }
  }
  for (var i = 0; i < inp.length; i ++) {
    var type = checkType(inp[i], prevType)
    if (type !== prevType) {
      switch (type) {
      case objTypes.CLOSEPAREN:
        if (prevType === objTypes.NUMBER) flushInputNumber()
        if (!objs.op) {
          var index = objs.index
          objs = objs.parent
          objs.operand[index] = objs.operand[index].operand[0]
        } else objs = objs.parent
        if (objs.implicit) objs = objs.parent
        break
      case objTypes.OPENPAREN:
        if (prevType === objTypes.NUMBER)   flushInputNumber()
        if (prevType === objTypes.OPERATOR) flushInputOperator()
        // if (prevType === objTypes.NUMBER
        //   || prevType === objTypes.CLOSEPAREN) {
        //   // Add implicit multiplication
        //   if (!objs.operand[1]) {
        //     objs.op = '*'
        //   } else {
        //     var newobj = new Operation(objs.parent, '*')
        //     newobj.index = objs.index
        //     newobj.operand[0] = objs
        //     newobj.implicit = true
        //     objs.parent = newobj
        //     objs = newobj
        //     if (newobj.parent === null) parent = newobj
        //     else if (newobj.index != null) newobj.parent.operand[newobj.index] = newobj
        //   }
        // }
        if (objs.operand[1] || !objs.op) throw new Error('should not happen')
        if (!objs.operand[0]) {
          objs.operand[0] = new Operation(objs)
          objs.operand[0].index = 0
          objs = objs.operand[0]
        } else {
          objs.operand[1] = new Operation(objs)
          objs.operand[1].index = 1
          objs = objs.operand[1]
        }
        break
      default:
        switch (prevType) {
        case objTypes.NUMBER:
          flushInputNumber()
          break
        case objTypes.OPERATOR:
          flushInputOperator()
          break
        //default: throw new Error('should not happen')
        }
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

  return parent.calculate(logger)
}

if (typeof module !== 'undefined') {
  module.exports = calculate
}
