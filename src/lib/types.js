
export class Asset {
    constructor(assetId, skin, entityType) {
      this.assetId = assetId
      this.skinId = Buffer.from(skin, 'hex').toString()
      this.entityType = entityType
    }
  
    inventory() {
      return {
        assetId: this.id,
        skinId: this.skinId,
      }
    }
  
    static async findByOwner(blockchain, accountId, iface, meta, properties) {
      const assets = await blockchain.query(...findAssetsByOwner(accountId, iface, meta, properties))
  
      return assets
    }
  }