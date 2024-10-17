const {loadModule, characterStorage} = mod.getContext(import.meta);
const {
    priorityTypes,
    SKILLS,
    SKILL_ACTIONS,
    hasItA,
    abyssalRealm,
    melvorRealm,
    itARealms
} = await loadModule('src/Consts.mjs');
const {getMasteryLevel} = await loadModule('src/Utils.mjs');

const configVersion = 2;

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
    characterStorage.setItem('config', {version: configVersion, config: toStorage});
}

async function loadConfig() {
    let config = initConfig();
    let storedConfig = characterStorage.getItem('config');

    if (!storedConfig) {
        return config;
    }

    //config has changes so much object -> compressed base64, need to clear stored config and start over
    if (storedConfig.version !== configVersion) {
        console.log('skiller - stored config version did not match current config version, removing stored config', storedConfig.version, configVersion);
        characterStorage.removeItem('config');
        return config;
    }

    storedConfig = JSON.parse(await decompress(storedConfig.config, 'gzip'));
    config = {...config, ...storedConfig};

    // console.log('skiller - loadConfig', config);
    return config;
}

function initConfig() {
    let config = {}

    SKILLS.forEach(skill => {
        if (!hasItA && skill.id === 'harvesting') {
            return
        }

        SKILL_ACTIONS[skill.id] = {};
        let tmpActions = game[skill.id].actions.allObjects.map((a, idx) => {
            return {'idx': idx, 'action': a};
        });

        config[skill.id] = {
            enabled: false,
            collapsed: true,
            selectedRealm:  setSelectedRealm(skill.id),
            priorityType: priorityTypes.custom.id
        };

        game.realms.allObjects.forEach(realm => {
            let actions = tmpActions.filter(a => a.action.realm.id === realm.id);
            if (actions.length < 1) {
                return
            }

            SKILL_ACTIONS[skill.id][realm.id] = actions.sort((a, b) => {
                return itARealms.includes(realm)
                    ? a.action.abyssalLevel - b.action.abyssalLevel
                    : a.action.level - b.action.level;
            });

            let tmpConf = {
                priority: actions.map(a => a.idx),
                disabledActions: []
            }

            if (skill.hasMastery) {
                tmpConf.masteryDone = game[skill.id].actions.filter(thisAction => thisAction.realm.id === realm.id && getMasteryLevel(skill.id, thisAction) < 99).length === 0;
            }
            if (skill.hasIntensity) {
                tmpConf.intensityDone = game[skill.id].actions.filter(thisAction => thisAction.realm.id === realm.id && thisAction.intensityPercent < 100).length === 0;
            }

            config[skill.id][realm.id] = tmpConf;
        });

    });

    // console.log('skiller - initConfig', config);
    return config;
}

function setSelectedRealm(skillId) {
    if (game.activeAction && game.activeAction.id.toLowerCase().includes(skillId)) {
        if (skillId === 'woodcutting') {
            return Array.from(game.activeAction.activeTrees)[0].realm.id;
        } else if (skillId === 'fishing') {
            return game.activeAction.activeFish.realm.id;
        } else if (skillId === 'mining') {
            return game.activeAction.activeRock.realm.id;
        } else if (skillId === 'astrology') {
            return game.activeAction.activeConstellation.realm.id;
        } else if (skillId === 'harvesting') {
            return game.activeAction.activeVein.realm.id;
        } else if (skillId === 'thieving') {
            return game.activeAction.currentArea.realm.id;
        } else {
            return game.activeAction.activeRecipe.realm.id;
        }
    }

    return skillId === 'harvesting' ? abyssalRealm.id : melvorRealm.id
}

export {storeConfig, loadConfig, initConfig};