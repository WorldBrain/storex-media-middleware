const toBuffer = require('typedarray-to-buffer')
const Dauria = require('dauria')
import { StorageModule, StorageModuleConfig, StorageModuleConstructorArgs } from "@worldbrain/storex-pattern-modules";
import { UnsavedMediaObject, MediaObjectInfo, MediaStorage } from './types';

export class DatabaseMediaStorage extends StorageModule implements MediaStorage {
    constructor(private options : StorageModuleConstructorArgs & { autoPkType : 'int' | 'string' }) {
        super(options)
    }

    getConfig() : StorageModuleConfig {
        return {
            collections: {
                mediaObject: {
                    version: new Date('2019-05-31'),
                    fields: {
                        mimetype: { type: 'string' },
                        data: { type: 'blob' },
                    },
                }
            },
            operations: {
                createMediaObject: {
                    operation: 'createObject',
                    collection: 'mediaObject',
                },
                findMediaObject: {
                    operation: 'findObject',
                    collection: 'mediaObject',
                    args: { id: '$id:auto-pk' }
                },
            },
        }
    }

    async storeMediaObject(object : UnsavedMediaObject) : Promise<string | number> {
        return (await this.operation('createMediaObject', object)).object.id
    }

    async getMediaObjectInfo(identifier : string | number) : Promise<MediaObjectInfo | null> {
        if (this.options.autoPkType === 'int') {
            identifier = typeof identifier === 'string' ? parseInt(identifier) : identifier
        }

        const mediaObject = (await this.operation('findMediaObject', { id: identifier }))
        if (!mediaObject) {
            return null
        }

        const dataBuffer = toBuffer(mediaObject.data)
        const dataUri = Dauria.getBase64DataURI(dataBuffer, mediaObject.mimetype) as string
        return { url: dataUri }
    }
}
