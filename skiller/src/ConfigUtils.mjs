const { loadModule, characterStorage } = mod.getContext(import.meta);
const { priorityTypes, SKILLS, SKILL_ACTIONS, hasItA, abyssalRealm, eternalRealm, melvorRealm } = await loadModule('src/Consts.mjs');
const { getMasteryLevel } = await loadModule('src/Utils.mjs');

const configVersion = 1;

async function compress(string, encoding) {
    const byteArray = new TextEncoder().encode(string);
    const cs = new CompressionStream(encoding);
    const writer = cs.writable.getWriter();
    writer.write(byteArray);
    writer.close();

    return new Response(cs.readable).arrayBuffer().then((buffer) => {
        return btoa(new Uint8Array(buffer).reduce((data, byte) => {
            return data + String.fromCharCode(byte);
        }, ''));
    });
}

async function decompress(base64String, encoding) {
    var binaryString = atob(base64String);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const cs = new DecompressionStream(encoding);
    const writer = cs.writable.getWriter();
    writer.write(bytes.buffer);
    writer.close();

    return new Response(cs.readable).arrayBuffer().then((arrayBuffer) => {
        return new TextDecoder().decode(arrayBuffer);
    });
}

async function storeConfig(config) {
    const toStorage = await compress(JSON.stringify(config), 'gzip');
    characterStorage.setItem('config', { version: configVersion, config: toStorage });
}

async function loadConfig() {
    let config = initConfig();
    let storedConfig = characterStorage.getItem('config');

    if (!storedConfig) {
        return config;
    }

    //config has changes so much object -> compressed base64, need to clear stored config and start over
    if (storedConfig.version !== configVersion) {
        console.log('stored config version did not match current config version, removing stored config', storedConfig.version, configVersion);
        characterStorage.removeItem('config');
        return config;
    }

    storedConfig = JSON.parse(await decompress(storedConfig.config, 'gzip'));
    config = {...config, ...storedConfig};

    SKILLS.forEach(skill => {
        if (!hasItA && skill.id === 'harvesting' || !config[skill.id]) {}
        else {
            if (skill.hasMastery && !config[skill.id].masteryDone) {
                config[skill.id].masteryDone = game[skill.id].actions.filter(thisAction => getMasteryLevel(skill.id, thisAction) < 99).length === 0;
            }
            if (skill.hasIntensity && !config[skill.id].intensityDone) {
                config[skill.id].intensityDone = game[skill.id].actions.filter(thisAction => thisAction.intensityPercent < 100).length === 0;
            }
        }
    });

    return config;
}

function initConfig() {
    let config = {}

    SKILLS.forEach(skill => {
        if (!hasItA && skill.id === 'harvesting') {}
        else {
            SKILL_ACTIONS[skill.id] = game[skill.id].actions.allObjects.map((a, idx) => {
                return {'idx': idx, 'action': a};
            }).sort((a, b) => {
                let aLevel = a.action.realm.id === abyssalRealm.id ? a.action.abyssalLevel + 1000 : a.action.realm.id === eternalRealm.id ? 3000 : a.action.level;
                let bLevel = b.action.realm.id === abyssalRealm.id ? b.action.abyssalLevel + 1000 : b.action.realm.id === eternalRealm.id ? 3000 : b.action.level;

                return aLevel - bLevel
            });

            config[skill.id] = {
                enabled: false,
                collapsed: false,
                //FIXME: add realm selection, and use this in bestAction
                selectedRealm: skill.id === 'harvesting' ? abyssalRealm.id : melvorRealm.id,
                priorityType: priorityTypes.custom.id,
                priority: {},
                disabledActions: {}
            }

            config[skill.id].priority[melvorRealm.id] = SKILL_ACTIONS[skill.id].filter(a => a.action.realm.id === melvorRealm.id).map(a => a.idx);
            config[skill.id].priority[abyssalRealm.id] = SKILL_ACTIONS[skill.id].filter(a => a.action.realm.id !== melvorRealm.id).map(a => a.idx);

            config[skill.id].disabledActions[melvorRealm.id] = [];
            config[skill.id].disabledActions[abyssalRealm.id] = [];

            if (skill.hasMastery) {
                config[skill.id].masteryDone = false;
            }
            if (skill.hasIntensity) {
                config[skill.id].intensityDone = false;
            }
        }
    });

    return config;
}

export { storeConfig, loadConfig, initConfig };