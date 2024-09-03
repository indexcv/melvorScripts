export function setup({onInterfaceReady}) {

    //hooks
    onInterfaceReady(() => {
        const store = ui.createStore({
            defaultItemTabs() {
                bankerResetDefaultItemTabs()
            },
            moveItems() {
                bankerMoveAllBankItemsToFirstTab()
            }
        })

        const container = document.querySelector('bank-item-settings-menu div')

        ui.create({
            $template: '#banker-btn-root',
            store
        }, container);

        console.log(`banker loaded!`);
    });
}

function bankerResetDefaultItemTabs() {
    game.bank.defaultItemTabs = new Map();
}

function bankerMoveAllBankItemsToFirstTab() {
    game.bank.itemSelectionMode = 1;
    game.bank.items.forEach(item => {
        game.bank.toggleItemSelected(item);
    });
    game.bank.moveSelectedItemsToTab(0);
    game.bank.itemSelectionMode = 0;
}