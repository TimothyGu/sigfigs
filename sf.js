var str = '1.012 + 0.2'
var shouldBe = '1.2'

function Element (elem, type) {
  this.objs = []
  this.type = type
  this.val  = ''
  if (type = types.
}

function SigFigNum (num) {
  Element.apply(this, Array.prototype.slice.call(arguments))
  var pieces = num.split('.')
  this.int  = pieces[0]
  this.frac = pieces[1]
  this.val  = num
}
SigFigNum.prototype = new Element()

var types = Object.freeze({
  UNSPECIFIED: 0
, NUMBER  : 1
, OPERATOR: 2
, PAREN   : 3
})

function calculate (in) {
  // Sanitize input of non-numeric-or-operator characters
  in = in.split('').filter(/./.test.bind(/[0-9.+\-*\/()]/))

  var i = 0
  var tmp = ''
  var objs = []
  while (i < in.length) {
    
