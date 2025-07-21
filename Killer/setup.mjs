export async function setup({settings, onCharacterLoaded, patch}) {

    const _events = mitt();

    settings.section('General').add({
        type: 'switch',
        label: 'Bosses only',
        hint: 'Changes min/max hit and barrier value for bosses only',
        name: 'bossesOnly',
        default: true,
    });
    settings.section('General').add({
        type: 'switch',
        label: 'HP',
        hint: 'Change min/max hit value',
        name: 'changeHitpoints',
        default: false,
    });
    settings.section('General').add({
        type: 'switch',
        label: 'Barrier',
        hint: 'Change barrier damage value',
        name: 'changeBarrier',
        default: false,
    });
    settings.section('General').add({
        type: 'switch',
        label: 'Player HP',
        hint: 'Double player HP value',
        name: 'playerHP',
        default: false,
    });
    settings.section('General').add({
        type: 'number',
        label: 'Max and min hit from HP %',
        hint: 'Set min/max hit values - formula: original min/max hit value + % from HP, default: 0',
        name: 'hitPointsValue',
        default: 0,
    });
    settings.section('General').add({
        type: 'number',
        label: 'Barrier damage from barrier %',
        hint: 'Set flat barrier damage value - formula: original flatBarrierDamage modifier + % current barrier value, default: 0',
        name: 'barrierValue',
        default: 0,
    });
    settings.section('General').add({
        type: 'number',
        label: 'x times to double player HP',
        hint: 'Set how many times we doubling player HP, default: 1',
        name: 'doublePlayerHPTimes',
        default: 1,
    });


    //hooks
    onCharacterLoaded(() => {
        patch(Player, 'computeCombatStats').after(function () {
            if (settings.section('General').get('bossesOnly') && !game.combat.enemy.isBoss) {
                return
            }

            if (settings.section('General').get('changeHitpoints')) {
                let newMaxHit = game.combat.enemy.hitpoints * (0.01 * settings.section('General').get('hitPointsValue'))
                let oldMaxHit =  game.combat.player.stats.maxHit;

                game.combat.player.stats.maxHit = newMaxHit > oldMaxHit ? newMaxHit : oldMaxHit;

            }

            if (settings.section('General').get('changeBarrier')) {
                let newMaxHit = game.combat.enemy.barrier * (0.01 * settings.section('General').get('barrierValue'));
                let oldMaxHit = game.combat.player.stats.summoningMaxHit;

                game.combat.player.stats.summoningMaxHit =  newMaxHit > oldMaxHit ? newMaxHit : oldMaxHit;
            }

            if (settings.section('General').get('playerHP')) {
                let times = settings.section('General').get('doublePlayerHPTimes');

                let oldMax = game.combat.player.stats.maxHitpoints;
                let oldCurrent = game.combat.player.hitpoints;
                let newMax = oldMax * times;
                let newCurrent = oldCurrent * times;

                game.combat.player.stats.maxHitpoints = newMax;
                if (newCurrent >= newMax) {
                    game.combat.player.setHitpoints(newMax);
                } else {
                    game.combat.player.setHitpoints(newCurrent);
                }

                _events.emit('hitpointsChanged', new HitpointsChangedEvent(oldCurrent, oldMax, game.combat.player.hitpoints, game.combat.player.stats.maxHitpoints));
            }
        });
    });
}