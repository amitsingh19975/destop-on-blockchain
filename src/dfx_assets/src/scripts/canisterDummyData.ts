import { dfx } from './dfx';
import type { UserInfo } from './dfx/dfx.did.d';
import {
    AcceptableType, fetchAsset, handelCanisterErr, storeAssets, UIDType,
} from './canisterHelper';
import ROOT, {
    IDirectory, IFileSystem, makeDir, makeFile, serialize,
} from './fs';
import { readAsDataURL } from './utils';

const { createUser, reset } = dfx;

const USERS: UserInfo[] = [
    {
        firstname: 'Amit',
        lastname: 'Singh',
        avatar: [],
    },
];

const makeDefaultFs = (root: IDirectory) => {
    makeDir({ name: 'user' }, root);
    makeDir({ name: 'desktop' }, root);
    makeDir({ name: 'game' }, root);
    makeDir({ name: 'test' }, '/desktop', { root });
    const text = makeFile({
        name: 'test.txt',
        useNameToGetExt: true,
    }, root);

    const music = makeFile({
        name: 'Lofi Study',
        ext: 'mp3',
    }, root);
    // await writeFile<MediaType>({
    //     node: lofi,
    //     data: {
    //         data: './music/lofi-study.mp3',
    //         type: 'audio/mp3',
    //     },
    // });
    return {
        text,
        music,
    };
};

const constructStorage = (nodes: ReturnType<typeof makeDefaultFs>) => {
    const res: [UIDType, AcceptableType][] = [];
    res.push([
        nodes.text._uid,
        'This is an awesome TEXT EDITOR!',
    ]);
    res.push([
        nodes.music._uid,
        {
            data: './music/lofi-study.mp3',
            type: 'audio/mp3',
        },
    ]);
    return res;
};

export const newUser = async (user: UserInfo, fs: IFileSystem) => {
    const serializedFS = JSON.stringify(serialize(fs));
    const result = await createUser(user, [serializedFS]);
    handelCanisterErr(result);
    const mp3 = await (await fetch('./music/lofi-study.mp3')).blob();
    console.log('STORE START');
    await storeAssets('0', 'lofi-study', mp3);
    console.log('STORE FINSIHED');
    console.log('FETCH START');
    const data = await fetchAsset('0');
    console.log('FETCH FINSIHED');
    const url = window.URL.createObjectURL(data as Blob);
    console.log(url);
};

export const populateUsers = async (root = ROOT) => {
    await reset();
    const nodes = makeDefaultFs(root);
    USERS.forEach(async (user) => {
        await newUser(user, root);
    });
};
