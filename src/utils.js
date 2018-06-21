var proto = require('axe-protocol')
var struct = proto.struct
var defaultNetMessages = proto.messages.defaultMessages
var DefaultBlock = require('axecore-lib').BlockHeader
var inherits = require('inherits')
var assign = require('object-assign')

function createParams (params, assert) {
  assert = assert != null ? assert : true
  if (assert) {
    if (!params) {
      throw new Error('Must provide override params')
    }
    if (!params.blockchain) {
      throw new Error('Must provide blockchain params')
    }
    if (!params.blockchain.genesisHeader) {
      throw new Error('Must provide blockchain.genesisHeader')
    }
    if (!params.net) {
      throw new Error('Must provide net params')
    }
    if (params.net.magic == null) {
      throw new Error('Must provide net.magic')
    }
    if (!params.net.defaultPort) {
      throw new Error('Must provide net.defaultPort')
    }
  }

  if (!params.Block) {

    // configure axecore-lib BlockHeader as default block
    var Block = DefaultBlock
    params.Block = Block

    // implement missing methods from bitcoinjs-lib
    Block.prototype.getId = function() {
        var id = new Buffer(this._getHash(), 'hex').reverse()
        return id.toString('hex')
    }

    Block.prototype.getHash = function() {
        return(this._getHash())
    }

    if (params.structs && (params.structs.header || params.structs.transaction)) {
      var headerStruct = params.structs.header || proto.types.header
      var txStruct = params.structs.transaction || proto.types.transaction
      var txArrayStruct = struct.VarArray(proto.varint, txStruct)

      Block.prototype.toBuffer = function (headersOnly) {
        var header = headerStruct.encode(this)
        if (headersOnly || !this.transactions) return header
        var txs = txArrayStruct.encode(this.transactions)
        return Buffer.concat([ header, txs ])
      }

      Block.fromBuffer = function (buffer) {
        var block = new Block()
        var header = headerStruct.decode(buffer)
        assign(block, header)
        if (headerStruct.decode.bytes === buffer.length) return block
        block.transactions = txArrayStruct.decode(buffer, headerStruct.decode.bytes)
        return block
      }
    }
  }
  params.blockchain.Block = params.net.Block = params.Block

  function extend (child, assert) {
    var params = assign({}, extend, child)

    params.blockchain = assign({}, extend.blockchain, child.blockchain)
    delete params.blockchain.checkpoints

    params.net = assign({}, extend.net, {
      dnsSeeds: null,
      staticPeers: null,
      webSeeds: null
    }, child.net)
    var extendMessages = (extend.net && extend.net.messages) || defaultNetMessages
    params.net.messages = extendMessages(child.net.messages)

    params.structs = assign({}, extend.structs, child.structs)

    params.Block = null

    return createParams(params, assert)
  }
  return assign(extend, params)
}

module.exports = { createParams }
