export interface MediaStorage {
    storeMediaObject(object : UnsavedMediaObject) : Promise<string | number>
    getMediaObjectInfo(id : string | number) : Promise<MediaObjectInfo | null>
}

export interface UnsavedMediaObject {
    data : Buffer
    mimetype : string
}

export interface MediaObjectInfo {
    url : string
}
