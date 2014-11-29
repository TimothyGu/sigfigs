var sf = require('../')
var should = require("should")

describe('SigFigs', function (){
  describe('Signs', function (){
    it('should be 1 when positive', function () {
      for (var i = 0; i < 100; i ++) {
        var rand = (Math.random() * (1 / Math.random()))
        sf(String(rand)).sign.should.equal(1)
      }
    })
    it('should be -1 when negative', function () {
      for (var i = 0; i < 100; i ++) {
        var rand = -(Math.random() * (1 / Math.random()))
        sf(String(rand)).sign.should.equal(-1)
      }
    })
    it('should be 1 when 0', function () {
      sf('0' ).sign.should.equal(1)
      sf('-0').sign.should.equal(1)
      sf('+0').sign.should.equal(1)
      sf('0.').sign.should.equal(1)
      sf('-0').sign.should.equal(1)
      sf('+0').sign.should.equal(1)
    })
  })
  describe('Integer part', function () {
    it('should equal to the integer part of a number', function () {
      sf('0').int.should.equal(0)
      sf('0.19090').int.should.equal(0)
      sf('0.').int.should.equal(0)
      sf('-0.').int.should.equal(0)
      sf('1').int.should.equal(1)
      sf('1.0').int.should.equal(1)
      sf('+1').int.should.equal(1)
      sf('-1').int.should.equal(1)
      sf('2.9').int.should.equal(2)
      sf('-2.900').int.should.equal(2)
      sf('-120.').int.should.equal(120)
      sf('000100000000000000000000020.1').int.should.equal(100000000000000000000020)
    })
    it('should not be negative', function () {
      sf('0').int.should.not.be.below(0)
      sf('-9').int.should.not.be.below(0)
      sf('1202012012012012121').int.should.not.be.below(0)
      for (var i = 0; i < 200; i ++) {
        sf(String((Math.random() * (1 / Math.random()))
                - (Math.random() * (1 / Math.random()))))
        .int.should.not.be.below(0)
      }
    })
  })
})