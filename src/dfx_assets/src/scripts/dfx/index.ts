/* eslint-disable no-console */
import { Actor, HttpAgent } from '@dfinity/agent';
import type { HttpAgentOptions, ActorConfig, ActorSubclass } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { idlFactory } from './dfx.did';
import { _SERVICE } from './dfx.did.d';

export const createActor = (
    canisterId: string | Principal | undefined,
    options?: { agentOptions?: HttpAgentOptions, actorOptions?: ActorConfig },
): ActorSubclass<_SERVICE> => {
    if (typeof canisterId === 'undefined') {
        throw new Error('[createActor]: "canisterId" found to be undefined!');
    }
    const agent = new HttpAgent({ ...options?.agentOptions });

    // @ts-ignore
    if (process.env.NODE_ENV !== 'production') {
        agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
            console.error(err);
        });
    }
    // Creates an actor with using the candid interface and the HttpAgent
    return Actor.createActor(idlFactory, {
        agent,
        canisterId,
        ...options?.actorOptions,
    });
};

// @ts-ignore
export const canisterId = process.env.DFX_CANISTER_ID;

export const dfx = createActor(canisterId);
