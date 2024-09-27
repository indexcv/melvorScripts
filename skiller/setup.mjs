export async function setup({loadModule, settings, characterStorage, onCharacterLoaded, patch, onInterfaceReady}) {
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
        melvorRealm,
        abyssalRealm,
        eternalRealm
    } = await loadModule('src/Consts.mjs');
    const {
        getAction,
        getMasteryLevel,
        getMasteryXP,
        getXPRate,
        bankQty,
        getProduct
    } = await loadModule('src/Utils.mjs');

    //hooks
    onInterfaceReady(async () => {
        const t0 = performance.now();

        const skillerStore = ui.createStore({
            config: await loadConfig(),
            customPriorityType: priorityTypes.custom,
            sortables: {},
            skillerDebug: true,
            findSkill(skillId) {
                return SKILLS.find(s => s.id === skillId);
            },
            getMedia(skillId, action) {
                let product = getProduct(skillId, action);
                return product ? product.media : action.media;
            },
            getActions(skillId) {
                console.log('getActions', skillId);
                let priorityType = skillerStore.config[skillId].priorityType;
                let selectedRealm = skillerStore.config[skillId].selectedRealm;
                if(priorityType === priorityTypes.mastery.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getMasteryLevel(skillId, getAction(skillId, a.action.id)))
                        .sort((a, b) => getMasteryXP(skillId, getAction(skillId, b.action.id)) - getMasteryXP(skillId, getAction(skillId, a.action.id)));
                } else if(priorityType === priorityTypes.masteryLow.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getMasteryLevel(skillId, getAction(skillId, a.action.id)))
                        .sort((a, b) => getMasteryXP(skillId, getAction(skillId, a.action.id)) - getMasteryXP(skillId, getAction(skillId, b.action.id)));
                } else if(priorityType === priorityTypes.intensity.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getAction(skillId, a.action.id).intensityPercent < 100)
                        .sort((a, b) => getAction(skillId, b.action.id).intensityPercent - getAction(skillId, a.action.id).intensityPercent);
                } else if(priorityType === priorityTypes.intensityLow.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .filter(a => getAction(skillId, a.action.id).intensityPercent < 100)
                        .sort((a, b) => getAction(skillId, a.action.id).intensityPercent - getAction(skillId, b.action.id).intensityPercent);
                } else if(priorityType === priorityTypes.lowestQuantity.id) {
                    return SKILL_ACTIONS[skillId][selectedRealm]
                        .sort((a, b) => bankQty(getProduct(skillId, a.action)) - bankQty(getProduct(skillId, b.action)));
                } else if(priorityType === priorityTypes.bestXP.id) {
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
                    return priorityType === priorityTypes.custom
                        || priorityType === priorityTypes.bestXP
                        || (priorityType === priorityTypes.lowestQuantity && skill.includeQuantity)
                        || (priorityType === priorityTypes.sellsFor && skill.includeSellsFor)
                        || (skill.hasMastery && !skillerStore.config[skillId][selectedRealm].masteryDone && (priorityType === priorityTypes.mastery || priorityType === priorityTypes.masteryLow))
                        || (skill.hasIntensity && !skillerStore.config[skillId][selectedRealm].intensityDone && (priorityType === priorityTypes.intensity || priorityType === priorityTypes.intensityLow));
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
                skillerStore.config[skillId].priorityType = priorityType;
                skillerStore.sortables[skillId].option("disabled", priorityType !== priorityTypes.custom.id);
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
            async priorityReset(skillId) {
                skillerStore.config[skillId].priority[melvorRealm.id] = SKILL_ACTIONS[skillId].filter(a => a.action.realm.id === melvorRealm.id).map(a => a.idx);
                skillerStore.config[skillId].priority[abyssalRealm.id] = SKILL_ACTIONS[skillId].filter(a => a.action.realm.id !== melvorRealm.id).map(a => a.idx);
                let selectedRealm = skillerStore.config[skillId].selectedRealm;
                skillerStore.config[skillId][selectedRealm].priority = SKILL_ACTIONS[skillId][selectedRealm].map(a => a.idx);
                await storeConfig(skillerStore.config);
            },
            async skillConfigReset(skillId) {
                skillerStore.config[skillId].priorityType = priorityTypes.custom.id;
                game.realms.allObjects.forEach(realm => {
                    if (!SKILL_ACTIONS[skillId][realm.id]) { return }
                    skillerStore.config[skillId][realm.id].priority = SKILL_ACTIONS[skillId][realm.id].map(a => a.idx);
                    skillerStore.config[skillId][realm.id].disabledActions = [];
                });
                $(`.${skillId}-action-toggles div`).each((_, e) => {
                    $(e).css('opacity', 1);
                });
                await storeConfig(skillerStore.config);
            }
        });

        function Skiller(skillId) {
            return {
                $template: '#skillerRoot',
                store: skillerStore,
                skillId: skillId,
                mounted(skillId) {
                    let selectedRealm = skillerStore.config[skillId].selectedRealm;

                    skillerStore.config[skillId].disabledActions[selectedRealm].forEach(i => {
                        $(`#${skillId}-actionItem-${i}`).css('opacity', 0.25)
                    });

                    skillerStore.sortables[skillId] = Sortable.create(document.getElementById(`${skillId}-prioritySettings`), {
                        animation: 150,
                        filter: '.locked',
                        disabled: skillerStore.config[skillId].priorityType !== priorityTypes.custom.id,
                        onMove: (event) => {
                            if (event.related) {
                                return !event.related.classList.contains('locked');
                            }
                        },
                        onEnd: async (event) => {
                            skillerStore.config[skillId].priority[selectedRealm] = skillerStore.sortables[skillId].toArray().map(Number);
                            await storeConfig(skillerStore.config);
                        },
                    });
                    skillerStore.sortables[skillId].sort(skillerStore.config[skillId].priority[selectedRealm], true);

                    tippy(`#skiller-${skillId} [data-tippy-content]`, {
                        animation: false,
                        allowHTML: true
                    });
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
}