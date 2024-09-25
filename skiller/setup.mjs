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
                function sortFn(a, b) {
                    // b - a highest -> lowest , a - b lowest -> highest
                    // no custom sort here, Sortable.js is managing that
                    let priorityType = skillerStore.config[skillId].priorityType;
                    if (priorityType === priorityTypes.mastery.id) {
                        return getMasteryXP(skillId, getAction(skillId, b.action.id)) - getMasteryXP(skillId, getAction(skillId, a.action.id));
                    } else if (priorityType === priorityTypes.masteryLow.id) {
                        return getMasteryXP(skillId, getAction(skillId, a.action.id)) - getMasteryXP(skillId, getAction(skillId, b.action.id));
                    } else if (priorityType === priorityTypes.intensity.id) {
                        return getAction(skillId, b.action.id).intensityPercent - getAction(skillId, a.action.id).intensityPercent;
                    } else if (priorityType === priorityTypes.intensityLow.id) {
                        return getAction(skillId, a.action.id).intensityPercent - getAction(skillId, b.action.id).intensityPercent;
                    } else if (priorityType === priorityTypes.lowestQuantity.id) {
                        return bankQty(getProduct(skillId, a.action)) - bankQty(getProduct(skillId, b.action));
                    } else if (priorityType === priorityTypes.bestXP.id) {
                        return getXPRate(skillId, getAction(skillId, b.action.id)) - getXPRate(skillId, getAction(skillId, a.action.id));
                    } else if (priorityType === priorityTypes.sellsFor.id) {
                        if (skillId === 'thieving') {
                            return b.action.currencyDrops[0].quantity - a.action.currencyDrops[0].quantity;
                        } else if (skillId === 'herblore') {
                            return b.action.potions[3].sellsFor.quantity - a.action.potions[3].sellsFor.quantity
                        } else {
                            return b.action.product.sellsFor.quantity - a.action.product.sellsFor.quantity
                        }
                    } else {
                        return 0;
                    }
                }
                function filterFn(item) {
                    let priorityType = skillerStore.config[skillId].priorityType;
                    let sameRealm = item.action.realm.id === skillerStore.config[skillId].selectedRealm;
                    let masteryLessThan99 = (priorityType === priorityTypes.mastery.id || priorityType === priorityTypes.masteryLow.id) && getMasteryLevel(skillId, getAction(skillId, item.action.id)) < 99;
                    let intensityLessThan100 = (priorityType === priorityTypes.intensity.id || priorityType === priorityTypes.intensityLow.id) && getAction(skillId, item.action.id).intensityPercent < 100;
                    let otherPriorityTypes = (priorityType === priorityTypes.custom.id || priorityType === priorityTypes.lowestQuantity.id || priorityType === priorityTypes.bestXP.id || priorityType === priorityTypes.sellsFor.id)
                    return sameRealm && (masteryLessThan99 || intensityLessThan100 || otherPriorityTypes);
                }
                return SKILL_ACTIONS[skillId].filter(filterFn).sort(sortFn);
            },
            getPriorityTypes(skillId) {
                function priorityTypeFilter(priorityType) {
                    const skill = skillerStore.findSkill(skillId);
                    return priorityType === priorityTypes.custom
                        || priorityType === priorityTypes.bestXP
                        || (priorityType === priorityTypes.lowestQuantity && skill.includeQuantity)
                        || (priorityType === priorityTypes.sellsFor && skill.includeSellsFor)
                        || (skill.hasMastery && !skillerStore.config[skillId].masteryDone && (priorityType === priorityTypes.mastery || priorityType === priorityTypes.masteryLow))
                        || (skill.hasIntensity && !skillerStore.config[skillId].intensityDone && (priorityType === priorityTypes.intensity || priorityType === priorityTypes.intensityLow));
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
                if (skillerStore.config[skillId].disabledActions[selectedRealm].includes(actionItemIdx)) {
                    skillerStore.config[skillId].disabledActions[selectedRealm].splice(skillerStore.config[skillId].disabledActions[selectedRealm].indexOf(actionItemIdx), 1)
                    $(`#${skillId}-actionItem-${actionItemIdx}`).fadeTo(200, 1);
                } else {
                    skillerStore.config[skillId].disabledActions[selectedRealm].push(actionItemIdx);
                    $(`#${skillId}-actionItem-${actionItemIdx}`).fadeTo(200, 0.25);
                }
                await storeConfig(skillerStore.config);
            },
            async priorityReset(skillId) {
                skillerStore.config[skillId].priority[melvorRealm.id] = SKILL_ACTIONS[skillId].filter(a => a.action.realm.id === melvorRealm.id).map(a => a.idx);
                skillerStore.config[skillId].priority[abyssalRealm.id] = SKILL_ACTIONS[skillId].filter(a => a.action.realm.id !== melvorRealm.id).map(a => a.idx);
                await storeConfig(skillerStore.config);
            },
            async skillConfigReset(skillId) {
                skillerStore.config[skillId].priorityType = priorityTypes.custom.id;
                skillerStore.config[skillId].priority[melvorRealm.id] = SKILL_ACTIONS[skillId].filter(a => a.action.realm.id === melvorRealm.id).map(a => a.idx);
                skillerStore.config[skillId].priority[abyssalRealm.id] = SKILL_ACTIONS[skillId].filter(a => a.action.realm.id !== melvorRealm.id).map(a => a.idx);
                skillerStore.config[skillId].disabledActions[melvorRealm.id] = [];
                skillerStore.config[skillId].disabledActions[abyssalRealm.id] = [];
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

        console.log(`Skiller loaded!`);
    });
}