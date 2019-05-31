import { Buffer } from 'buffer'
import expect from 'expect'
import StorageManager from '@worldbrain/storex';
import { DexieStorageBackend } from '@worldbrain/storex-backend-dexie';
import inMemory from '@worldbrain/storex-backend-dexie/lib/in-memory';
import { DatabaseMediaStorage } from './db';
import { registerModuleMapCollections } from '@worldbrain/storex-pattern-modules';
import { MediaStorageMiddleware } from '.';

describe('In-database media storage', () => {
    async function setupTest() {
        const storageManager = new StorageManager({ backend: new DexieStorageBackend({ idbImplementation: inMemory(), dbName: 'unittest' }) })
        storageManager.registry.registerCollections({
            user: {
                version: new Date(),
                fields: {
                    picture: { type: 'media' }
                }
            }
        })

        const mediaStorage = new DatabaseMediaStorage({ storageManager, autoPkType: 'int' })
        registerModuleMapCollections(storageManager.registry, {
            mediaStorage
        })
        await storageManager.finishInitialization()

        storageManager.setMiddleware([
            new MediaStorageMiddleware({ mediaStorage, storageRegistry: storageManager.registry })
        ])

        return { storageManager, mediaStorage }
    }

    it('should correctly write media objects on create', async () => {
        const { storageManager, mediaStorage } = await setupTest()

        await storageManager.collection('user').createObject({
            picture: { mimetype: 'text/plain', data: Buffer.from('test') }
        })

        const mediaObjects = await storageManager.collection('mediaObject').findObjects({})
        expect(mediaObjects).toEqual([ {
            id: 1,
            mimetype: 'text/plain',
            data: new Uint8Array('test'.split('').map((c : string) => c.charCodeAt(0))),
        } ])
    })

    it('should correctly generate data URIs', async () => {
        const { storageManager, mediaStorage } = await setupTest()
        const id = await mediaStorage.storeMediaObject({
            mimetype: 'text/plain', data: Buffer.from('test')
        })

        const info = await mediaStorage.getMediaObjectInfo(id)
        expect(info!.url).toEqual('data:text/plain;base64,dGVzdA==')
    })

    it('should correctly retrieve media URLs on findObject', async () => {
        const { storageManager, mediaStorage } = await setupTest()

        const storedUser = (await storageManager.collection('user').createObject({
            picture: { mimetype: 'text/plain', data: Buffer.from('test') }
        })).object

        const retrievedUser = await storageManager.collection('user').findObject<{ picture : string }>({ id: storedUser.id })
        expect(retrievedUser!.picture).toEqual({ url: 'data:text/plain;base64,dGVzdA==' })
    })
})
