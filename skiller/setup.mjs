export async function setup({loadModule, settings, onCharacterLoaded, onInterfaceReady}) {

    const {
        storeConfig,
        loadConfig,
        initConfig
    } = await loadModule('src/ConfigUtils.mjs');
    const {
        SKILLS,
        priorityTypes,
        SKILL_ACTIONS,
        hasItA,
    } = await loadModule('src/Consts.mjs');
    const {
        getAction,
        getMasteryLevel,
        getMasteryXP,
        getXPRate,
        bankQty,
        getProduct
    } = await loadModule('src/Utils.mjs');
    const events = mitt();

    window.skillerMod = {
        SKILLS: SKILLS,
        SKILL_ACTIONS: SKILL_ACTIONS,
        priorityTypes: priorityTypes,
        hasItA: hasItA
    };

    settings.section('General').add({
        type: 'button',
        name: 'reset',
        display: 'Reset all settings to default?',
        color: 'danger',
        onClick: () => events.emit('skillerResetAllSettings'),
    });
    settings.section('Debug').add({
        type: 'switch',
        label: 'Show debug',
        hint: 'Show debug, divs under skiller mod menus',
        name: 'showDebug',
        default: false,
        onChange(value) {
            events.emit('skillerShowDebug', value);
        },
    });

    //hooks
    onInterfaceReady(async () => {
        const t0 = performance.now();

        const skillerStore = ui.createStore({
            config: skillerMod.config,
            customPriorityType: priorityTypes.custom,
            sortables: {},
            tippies: {},
            skillerDebug: settings.section('Debug').get('showDebug'),
            findSkill(skillId) {
                return SKILLS.find(s => s.id === skillId);
            },
            getMedia(skillId, action) {
                let product = getProduct(skillId, action);
                return product ? product.media : action.media;
            },
            getActions(skillId) {
                let priorityType = skillerStore.config[skillId].priorityType;
                let selectedRealm = skillerStore.config[skillId].selectedRealm;
                if (priorityType === priorityTypes.mastery.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getMasteryLevel(skillId, getAction(skillId, a.action.id)))
                        .sort((a, b) => getMasteryXP(skillId, getAction(skillId, b.action.id)) - getMasteryXP(skillId, getAction(skillId, a.action.id)));
                } else if (priorityType === priorityTypes.masteryLow.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getMasteryLevel(skillId, getAction(skillId, a.action.id)))
                        .sort((a, b) => getMasteryXP(skillId, getAction(skillId, a.action.id)) - getMasteryXP(skillId, getAction(skillId, b.action.id)));
                } else if (priorityType === priorityTypes.intensity.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getAction(skillId, a.action.id).intensityPercent < 100)
                        .sort((a, b) => getAction(skillId, b.action.id).intensityPercent - getAction(skillId, a.action.id).intensityPercent);
                } else if (priorityType === priorityTypes.intensityLow.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getAction(skillId, a.action.id).intensityPercent < 100)
                        .sort((a, b) => getAction(skillId, a.action.id).intensityPercent - getAction(skillId, b.action.id).intensityPercent);
                } else if (priorityType === priorityTypes.lowestQuantity.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .sort((a, b) => bankQty(getProduct(skillId, a.action)) - bankQty(getProduct(skillId, b.action)));
                } else if (priorityType === priorityTypes.bestXP.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .sort((a, b) => getXPRate(skillId, getAction(skillId, b.action.id)) - getXPRate(skillId, getAction(skillId, a.action.id)));
                } else if (priorityType === priorityTypes.sellsFor.id) {
                    if (skillId === 'thieving') {
                        return SKILL_ACTIONS[skillId][selectedRealm]
                            .sort((a, b) => b.action.currencyDrops[0].quantity - a.action.currencyDrops[0].quantity);
                    } else if (skillId === 'herblore') {
                        return SKILL_ACTIONS[skillId][selectedRealm]
                            .sort((a, b) => b.action.potions[3].sellsFor.quantity - a.action.potions[3].sellsFor.quantity);
                    } else {
                        return SKILL_ACTIONS[skillId][selectedRealm]
                            .sort((a, b) => b.action.product.sellsFor.quantity - a.action.product.sellsFor.quantity);
                    }
                } else {
                    return SKILL_ACTIONS[skillId][selectedRealm];
                }
            },
            getPriorityTypes(skillId) {
                function priorityTypeFilter(priorityType) {
                    const skill = skillerStore.findSkill(skillId);
                    const selectedRealm = skillerStore.config[skillId].selectedRealm;
                    return [priorityTypes.custom, priorityTypes.bestXP].includes(priorityType)
                        || (priorityType === priorityTypes.lowestQuantity && skill.includeQuantity)
                        || (priorityType === priorityTypes.sellsFor && skill.includeSellsFor)
                        || (skill.hasMastery && !skillerStore.config[skillId][selectedRealm].masteryDone && [priorityTypes.mastery, priorityTypes.masteryLow].includes(priorityType))
                        || (skill.hasIntensity && !skillerStore.config[skillId][selectedRealm].intensityDone && [priorityTypes.intensity, priorityTypes.intensityLow].includes(priorityType));
                }

                return Object.values(priorityTypes).filter(priorityTypeFilter)
            },
            async setEnabled(skillId, enabled) {
                skillerStore.config[skillId].enabled = enabled;
                await storeConfig(skillerStore.config);
            },
            async setCollapsed(skillId, collapsed) {
                skillerStore.config[skillId].collapsed = collapsed;
                await storeConfig(skillerStore.config);
            },
            async setPriorityType(skillId, priorityType) {
                if (priorityType === skillerStore.config[skillId].priorityType) {
                    return
                }
                skillerStore.config[skillId].priorityType = priorityType;
                events.emit('skillerSetPriorityType', {skillId: skillId, priorityType: priorityType});
                await storeConfig(skillerStore.config);
            },
            async setDisableItem(skillId, actionItemIdx) {
                let selectedRealm = skillerStore.config[skillId].selectedRealm;
                if (skillerStore.config[skillId][selectedRealm].disabledActions.includes(actionItemIdx)) {
                    skillerStore.config[skillId][selectedRealm].disabledActions.splice(skillerStore.config[skillId][selectedRealm].disabledActions.indexOf(actionItemIdx), 1)
                    $(`#${skillId}-actionItem-${actionItemIdx}`).fadeTo(200, 1);
                } else {
                    skillerStore.config[skillId][selectedRealm].disabledActions.push(actionItemIdx);
                    $(`#${skillId}-actionItem-${actionItemIdx}`).fadeTo(200, 0.25);
                }
                await storeConfig(skillerStore.config);
            },
            async setSelectedRealm(skillId, realmId) {
                skillerStore.config[skillId].selectedRealm = realmId;
                events.emit('skillerSetPriorityType', {
                    skillId: skillId,
                    priorityType: skillerStore.config[skillId].priorityType
                });
                await storeConfig(skillerStore.config);
            },
            async setMasteryDone(skillId, realm) {
                skillerStore.config[skillId][realm].masteryDone = true;
                await storeConfig(skillerStore.config);
            },
            async setIntensityDone(skillId, realm) {
                skillerStore.config[skillId][realm].intensityDone = true;
                await storeConfig(skillerStore.config);
            },
            async priorityReset(skillId) {
                let selectedRealm = skillerStore.config[skillId].selectedRealm;
                skillerStore.config[skillId][selectedRealm].priority = SKILL_ACTIONS[skillId][selectedRealm].map(a => a.idx);
                events.emit('skillerSetPriorityType', {skillId: skillId, priorityType: priorityTypes.custom.id});
                await storeConfig(skillerStore.config);
            },
            async skillConfigReset(skillId) {
                skillerStore.config[skillId].priorityType = priorityTypes.custom.id;
                game.realms.allObjects.forEach(realm => {
                    if (!SKILL_ACTIONS[skillId][realm.id]) {
                        return
                    }
                    skillerStore.config[skillId][realm.id].priority = SKILL_ACTIONS[skillId][realm.id].map(a => a.idx);
                    skillerStore.config[skillId][realm.id].disabledActions = [];
                });
                $(`.${skillId}-action-toggles div`).each((_, e) => {
                    $(e).css('opacity', 1);
                });
                events.emit('skillerSetPriorityType', {skillId: skillId, priorityType: priorityTypes.custom.id});
                await storeConfig(skillerStore.config);
            },
        });
        skillerMod['store'] = skillerStore;

        events.on('skillerSetPriorityType', value => {
            let skillId = value.skillId

            setTimeout(() => {
                makeSortable(skillId, value.priorityType, skillerStore.config[skillId].selectedRealm);
                makeTippy(skillId);
            }, 300);
        });

        events.on('skillerShowDebug', value => {
            skillerStore.skillerDebug = value;
        });

        events.on('skillerResetAllSettings', async () => {
            skillerMod['config'] = initConfig();
            skillerStore.config = skillerMod['config'];
            await storeConfig(skillerStore.config);

            setTimeout(() => {
                Object.values(SKILLS).forEach(skill => {
                    makeSortable(skill.id, skillerStore.config[skill.id].priorityType, skillerStore.config[skill.id].selectedRealm);
                    makeTippy(skill.id)
                });
            }, 300);
        })

        function makeTippy(skillId) {
            if (skillerStore.tippies[skillId]) {
                skillerStore.tippies[skillId].forEach(t => t.destroy());
                delete skillerStore.tippies[skillId]
            }

            skillerStore.tippies[skillId] = tippy(`#skiller-${skillId} [data-tippy-content]`, {
                animation: false,
                allowHTML: true
            });
        }

        function makeSortable(skillId, priorityType, selectedRealm) {
            if (skillerStore.sortables[skillId]) {
                skillerStore.sortables[skillId].destroy()
                delete skillerStore.sortables[skillId]
            }
            if (priorityType === priorityTypes.custom.id) {
                skillerStore.sortables[skillId] = Sortable.create(document.getElementById(`${skillId}-prioritySettings`), {
                    animation: 150,
                    filter: '.locked',
                    disabled: priorityType !== priorityTypes.custom.id,
                    onMove: (event) => {
                        if (event.related) {
                            return !event.related.classList.contains('locked');
                        }
                    },
                    onEnd: async (event) => {
                        skillerStore.config[skillId][selectedRealm].priority = skillerStore.sortables[skillId].toArray().map(Number);
                        await storeConfig(skillerStore.config);
                    },
                });

                skillerStore.sortables[skillId].sort(skillerStore.config[skillId][selectedRealm].priority, true);
            }
        }

        function Skiller(skillId) {
            return {
                $template: '#skillerRoot',
                store: skillerStore,
                skillId: skillId,
                mounted(skillId) {
                    let selectedRealm = skillerStore.config[skillId].selectedRealm;
                    let priorityType = skillerStore.config[skillId].priorityType;

                    skillerStore.config[skillId][selectedRealm].disabledActions.forEach(i => {
                        $(`#${skillId}-actionItem-${i}`).css('opacity', 0.25)
                    });

                    makeSortable(skillId, priorityType, selectedRealm);
                    makeTippy(skillId)
                }
            }
        }

        Object.values(SKILLS).forEach(skill => {
            $(`#${skill.id}-container div[class="skill-info"]`).after(`<div v-scope="Skiller('${skill.id}')"></div>`);
            PetiteVue.createApp({Skiller}).mount();
        });

        const t1 = performance.now();
        console.log(`%c[Skiller] GUI | Loading took ${t1 - t0}ms`, 'color: #03a9fc');
    });

    onCharacterLoaded(async () => {
        const t0 = performance.now();
        skillerMod['config'] = await loadConfig();

        await loadModule('src/Patching.mjs');

        const t1 = performance.now();
        console.log(`%c[Skiller] Patching | Loading took ${t1 - t0}ms`, 'color: #03a9fc');
    });
}