const apiUrl = 'https://node.jx3box.com/manufactures';

let recipes = [];
let selectedItems = new Set();
let materialMap = {};

async function fetchData() {
    const res = await fetch(apiUrl);
    const data = await res.json();
    recipes = data?.data || [];
    renderItemList();
}

function renderItemList() {
    const container = document.getElementById('item-list');
    container.innerHTML = '';
    recipes.forEach(item => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" data-id="${item.ID}" />
            [${item.Category}] ${item.Name}
        `;
        container.appendChild(label);
    });
}

function calculateMaterials() {
    materialMap = {};
    selectedItems.forEach(id => {
        const item = recipes.find(r => r.ID == id);
        if (item?.Materials) {
            item.Materials.forEach(mat => {
                if (!materialMap[mat.Name]) {
                    materialMap[mat.Name] = { qty: 0, selfMade: false, recipe: null };
                }
                materialMap[mat.Name].qty += mat.Count;
                // 查找是否有 recipe（能否生产）
                const subRecipe = recipes.find(r => r.Name === mat.Name);
                if (subRecipe) {
                    materialMap[mat.Name].recipe = subRecipe;
                }
            });
        }
    });
    renderMaterialTable();
}

function renderMaterialTable() {
    const tbody = document.querySelector('#material-table tbody');
    tbody.innerHTML = '';
    Object.entries(materialMap).forEach(([name, mat]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${name}</td>
            <td>${mat.qty}</td>
            <td>
                ${mat.recipe ? `<input type="checkbox" data-name="${name}" ${mat.selfMade ? 'checked' : ''} />` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleItemSelection() {
    selectedItems.clear();
    document.querySelectorAll('#item-list input[type="checkbox"]').forEach(input => {
        if (input.checked) {
            selectedItems.add(input.dataset.id);
        }
    });
    calculateMaterials();
}

function handleSelfMadeToggle(e) {
    if (e.target.matches('input[type="checkbox"][data-name]')) {
        const name = e.target.dataset.name;
        materialMap[name].selfMade = e.target.checked;
        if (e.target.checked) {
            // 展开二级原料
            const subRecipe = materialMap[name].recipe;
            if (subRecipe?.Materials) {
                subRecipe.Materials.forEach(subMat => {
                    if (!materialMap[subMat.Name]) {
                        materialMap[subMat.Name] = { qty: 0, selfMade: false, recipe: null };
                    }
                    materialMap[subMat.Name].qty += subMat.Count * Math.ceil(materialMap[name].qty / subRecipe.OutputCount);
                    const subSubRecipe = recipes.find(r => r.Name === subMat.Name);
                    if (subSubRecipe) {
                        materialMap[subMat.Name].recipe = subSubRecipe;
                    }
                });
            }
        }
        renderMaterialTable();
    }
}

function handleSearch() {
    const keyword = document.getElementById('search').value.trim();
    document.querySelectorAll('#item-list label').forEach(label => {
        const text = label.textContent;
        label.style.display = text.includes(keyword) ? 'block' : 'none';
    });
}

function handleBazhiSelect() {
    document.querySelectorAll('#item-list input[type="checkbox"]').forEach(input => {
        const labelText = input.parentElement.textContent;
        if (labelText.includes('梓匠')) {
            input.checked = true;
        }
    });
    handleItemSelection();
}

function exportExcel() {
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ['材料名', '数量', '来源']
    ];

    Object.entries(materialMap).forEach(([name, mat]) => {
        ws_data.push([
            name,
            mat.qty,
            mat.selfMade ? '自己生产' : '购买/采集'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, '材料清单');
    XLSX.writeFile(wb, 'jx3_materials.xlsx');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    document.getElementById('item-list').addEventListener('change', handleItemSelection);
    document.querySelector('#material-table tbody').addEventListener('change', handleSelfMadeToggle);
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('select-bazhi').addEventListener('click', handleBazhiSelect);
    document.getElementById('export-btn').addEventListener('click', exportExcel);
});
