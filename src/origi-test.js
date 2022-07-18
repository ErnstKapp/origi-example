
const pcl = require('postchain-client');
const Config = require('./config')

const {
        op,
        Postchain,
        User,
        KeyPair,
        FlagsType,
        SingleSignatureAuthDescriptor,
      } = require('ft3-lib')

const { Filehub, FsFile } = require('@snieking/fs-client')


const nodeApiUrl = "http://localhost:7740";  //Fill this url with where your node is. 
const rest = pcl.restClient.createRestClient(nodeApiUrl, Config.brid, 5)
const gtx = pcl.gtxClient.createClient(
       rest,
       Buffer.from(
       Config.brid,
       'hex'
       ),
       []
   );

const adminPUB = Buffer.from(
        '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
        'hex'
);
const adminPRIV = Buffer.from(
        '0101010101010101010101010101010101010101010101010101010101010101',
        'hex'
);



async function bring_original(account_id){

        return await gtx.query("bear.get_last_n_minted_originals", {account_id : account_id});
}



async function initialize(adminPubKey, adminPrivKey){
	//const adminPubKey = pcl.util.toBuffer(adminPUB);
        const tx = gtx.newTransaction([adminPubKey]);
	tx.addOperation("bear.initialize");
	tx.sign(adminPrivKey, adminPubKey);
	await tx.postAndWaitConfirmation();
}

async function registerUserOnFileHubIfNeeded(user) {
        const blockchain = await new Postchain(Config.fileHub.url).blockchain(Config.fileHub.brid)
      
        const account = await blockchain.query('ft3.get_account_by_id', {
          id: user.authDescriptor.id,
        })
      
        if (account != null) return
      
        await blockchain.registerAccount(user.authDescriptor, user)
}

async function uploadImages(user, structures) {
        const filehub = new Filehub(Config.fileHub.url, Config.fileHub.brid)
      
        await registerUserOnFileHubIfNeeded(user)
      
        for (const structure of structures) {
          if (!structure.image) continue
      
          const fileContent = Buffer.from(structure.image, 'utf8')
          const file = FsFile.fromData(fileContent)
      
          try {
            const retrievedFile = await filehub.getFile(file.hash)
      
            if (retrievedFile) {
              structure.properties.push([
                ['chromia.ITradable', 'image'],
                File(file.hash, Config.fileHub.brid, Config.fileHub.url),
              ])
              continue
            }
          } catch (error) {
            console.log("File doesn't exist")
          }
      
          await filehub.storeFile(user, file)
          structure.properties.push([
            ['chromia.ITradable', 'image'],
            File(file.hash, Config.fileHub.brid, Config.fileHub.url),
          ])
        }
      }


function createUser(privKey) {
  const keyPair = privKey ? new KeyPair(privKey) : new KeyPair()
  return new User(
    keyPair,
    new SingleSignatureAuthDescriptor(keyPair.pubKey, [FlagsType.Account, FlagsType.Transfer]),
  )
}

function Text(value) {
  return [a_type.text, value, null]
}

function ByteArray(value) {
  return [a_type.byte_array, value, null]
}

function File(hash, brid, location) {
  return [a_type.file, [hash, brid, location], null]
}

const a_type = {
        boolean: 0,
        byte_array: 1,
        decimal: 2,
        id: 3,
        instance: 4,
        integer: 5,
        text: 6,
        file: 10,
      }

structures = [ {
        name: 'Bear',
        interfaces: ['com.chromia.bear.IBear'],
        properties: [
          [['chromia.IOriginal', 'name'], Text('Bobo')],
          [
            ['chromia.IOriginal', 'creator_id'],
            ByteArray(
              Buffer.from('18A72DD00D08B0589200F53B34FE0544DE8C93148BD50207A560F147CF2311D9', 'hex'),
            ),
          ],
          [['chromia.IOriginal', 'creator_name'], Text('UberArtist')],
          [['chromia.IOriginal', 'description'], Text('A cool Bear')],
         // [['com.chromia.planetary.IHeadAccessory', 'skin'], ByteArray(Buffer.from('head4'))],
        ],
        image:
          "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"
      },
      {
      name: 'RedShirt',
        interfaces: ['com.chromia.bear.ITshirt'],
        properties: [
          [['chromia.IOriginal', 'name'], Text('RedShirt')],
          [
            ['chromia.IOriginal', 'creator_id'],
            ByteArray(
              Buffer.from('18A72DD00D08B0589200F53B34FE0544DE8C93148BD50207A560F147CF2311D9', 'hex'),
            ),
          ],
          [['chromia.IOriginal', 'creator_name'], Text('UberArtist')],
          [['chromia.IOriginal', 'description'], Text('A cool Shirt')],
         // [['com.chromia.planetary.IHeadAccessory', 'skin'], ByteArray(Buffer.from('head4'))],
        ],
        image:
          "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"
      }
]      

async function test(){
        const user1 = createUser(Config.adminPrivKey)
        const blockchain = await new Postchain(Config.nodeUrl).blockchain(Config.brid)
        await blockchain.call(op('ft3.dev_register_account', user1.authDescriptor), user1)
        
        await blockchain.call(op('bear.initialize', [user1.authDescriptor.id, user1.authDescriptor.id]), user1)
        await uploadImages(user1, structures);

        for (const { name, interfaces, properties } of structures) {
                console.log(`Registering prototype '${name}'`)
                await blockchain.call(
                  op(
                    'originals.def_original_prototype_op',
                    [user1.authDescriptor.id, user1.authDescriptor.id],
                    interfaces[0],
                    properties,
                    name,
                    null,
                  ),
                  user1,
                )
        }
        // Få hash från filehub och skicka
        
          const account= await blockchain.query('ft3.get_account_by_id', {
                id: user1.authDescriptor.id,
              })
        
            
        console.log(account);
        
        
        const auth_descriptor_id = user1.authDescriptor.id;
        


        await blockchain.call(op('bear.make_new_bear', [user1.authDescriptor.id, user1.authDescriptor.id], 5), user1)
        await blockchain.call(op('bear.make_new_tshirt', [user1.authDescriptor.id, user1.authDescriptor.id], "red"), user1)

        await blockchain.call(op('bear.give_bear_tshirt', auth_descriptor_id, account), user1)

        if (account != null){


        let res = await blockchain.query('bear.get_last_n_minted_originals', {account_id : account})
        console.log(res);}
        else{
          return 0;
        } 
            }
test();
