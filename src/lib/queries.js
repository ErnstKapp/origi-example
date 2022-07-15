export function findAssetsByOwner(accountId, iface, meta, properties) {
    return [
      'bear.find_originals_by_owner',
      {
        interface: iface,
        owner_id: accountId,
        meta,
        attributes: properties,
      },
    ]
  }