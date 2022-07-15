
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
          'ICA8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjQ1MCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCA0NTAgNDAwIiBmaWxsPSJub25lIj4KICAgIDxwYXRoCiAgICAgIG9wYWNpdHk9IjAuMjkiCiAgICAgIGQ9Ik0xOTMuMSAxMDIuNjM1bC0yOC43IDI1LjEgNy43IDEzLjggMzQuNS0yOS45LTEzLjUtOXoiCiAgICAgIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiCiAgICAvPgogICAgPHBhdGgKICAgICAgb3BhY2l0eT0iMC4yOSIKICAgICAgZD0iTTI2Ni43IDEwMS41MzVsLTI4LjYgMjUuMSA3LjYgMTMuOCAzNC41LTI5LjktMTMuNS05eiIKICAgICAgZmlsbD0idXJsKCNwYWludDFfbGluZWFyKSIKICAgIC8+CiAgICA8cGF0aAogICAgICBkPSJNMTg3LjQgMTAzLjQzNWMxMS43IDAgMjEuMiA5LjUgMjEuMiAyMS4ycy05LjUgMjEuMi0yMS4yIDIxLjItMjEuMi05LjUtMjEuMi0yMS4yIDkuNS0yMS4yIDIxLjItMjEuMnptMC00Yy0xMy45IDAtMjUuMiAxMS4zLTI1LjIgMjUuMiAwIDEzLjkgMTEuMyAyNS4yIDI1LjIgMjUuMiAxMy45IDAgMjUuMi0xMS4zIDI1LjItMjUuMiAwLTEzLjktMTEuMy0yNS4yLTI1LjItMjUuMnpNMjYyLjYgMTAzLjQzNWMxMS43IDAgMjEuMiA5LjUgMjEuMiAyMS4ycy05LjUgMjEuMi0yMS4yIDIxLjItMjEuMi05LjUtMjEuMi0yMS4yIDkuNS0yMS4yIDIxLjItMjEuMnptMC00Yy0xMy45IDAtMjUuMiAxMS4zLTI1LjIgMjUuMiAwIDEzLjkgMTEuMyAyNS4yIDI1LjIgMjUuMiAxMy45IDAgMjUuMi0xMS4zIDI1LjItMjUuMiAwLTEzLjktMTEuMy0yNS4yLTI1LjItMjUuMnoiCiAgICAgIGZpbGw9IiMxRjE5MjMiCiAgICAvPgogICAgPHBhdGgKICAgICAgZD0iTTIxMS4xIDEyOC4zMzVjOC4yLTUuNyAxOS4xLTUuMyAyOCAwIgogICAgICBzdHJva2U9IiMxRjE5MjMiCiAgICAgIHN0cm9rZVdpZHRoPSI0IgogICAgICBzdHJva2VNaXRlcmxpbWl0PSIxMCIKICAgICAgc3Ryb2tlTGluZWNhcD0icm91bmQiCiAgICAgIHN0cm9rZUxpbmVqb2luPSJyb3VuZCIKICAgIC8+CiAgICA8ZGVmcz4KICAgICAgPGxpbmVhckdyYWRpZW50CiAgICAgICAgaWQ9InBhaW50MF9saW5lYXIiCiAgICAgICAgeDE9IjE2NC40IgogICAgICAgIHkxPSIxMjIuMDg1IgogICAgICAgIHgyPSIyMDYuNTI1IgogICAgICAgIHkyPSIxMjIuMDg1IgogICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICA+CiAgICAgICAgPHN0b3Agc3RvcENvbG9yPSIjZmZmIiAvPgogICAgICAgIDxzdG9wIG9mZnNldD0iMC4yNjkiIHN0b3BDb2xvcj0iI0ZBRjlGNiIgLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjAuNzE0NiIgc3RvcENvbG9yPSIjRUNFQURDIiAvPgogICAgICAgIDxzdG9wIG9mZnNldD0iMC45OTQ0IiBzdG9wQ29sb3I9IiNFMkRGQzkiIC8+CiAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgIGlkPSJwYWludDFfbGluZWFyIgogICAgICAgIHgxPSIyMzguMDU4IgogICAgICAgIHkxPSIxMjAuOTg1IgogICAgICAgIHgyPSIyODAuMTU4IgogICAgICAgIHkyPSIxMjAuOTg1IgogICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICA+CiAgICAgICAgPHN0b3Agc3RvcENvbG9yPSIjZmZmIiAvPgogICAgICAgIDxzdG9wIG9mZnNldD0iMC4yNjkiIHN0b3BDb2xvcj0iI0ZBRjlGNiIgLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjAuNzE0NiIgc3RvcENvbG9yPSIjRUNFQURDIiAvPgogICAgICAgIDxzdG9wIG9mZnNldD0iMC45OTQ0IiBzdG9wQ29sb3I9IiNFMkRGQzkiIC8+CiAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgPC9zdmc+',
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
        const account = await blockchain.query('ft3.get_account_by_id', {
                id: user1.authDescriptor.id,
              })

        await blockchain.call(op('bear.make_new_bear', [user1.authDescriptor.id, user1.authDescriptor.id]), user1)
        

        let res = await blockchain.query('bear.get_last_n_minted_originals', {auth_id : [user1.authDescriptor.id, user1.authDescriptor.id]})
        console.log(res);
}        

test();
