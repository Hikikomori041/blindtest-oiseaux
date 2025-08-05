import { restorePreviousContent } from './birdlists.js';
import { getApp } from './init.js';

birdlistMain();

async function birdlistMain() {
  let app = await getApp();
  if (!app.birdsData) {
    console.error("app.birdsData est introuvable !");
    return;
  }

  // const list = document.getElementById('bird-list');

  // Object.entries(app.birdsData).forEach(([nomFrancais, data]) => {
  //   const item = document.createElement('li');
  //   item.textContent = `${nomFrancais} (${data.nom_latin}) – ${data.type}`;
  //   list.appendChild(item);
  // });

  document.getElementById('back-button').addEventListener("click", (e) => {
    restorePreviousContent({app});
  });


  const birdLists = document.getElementById('my-lists');
  // console.log(birdLists);
  for (let birdList of birdLists.getElementsByClassName('list-cell')) {
    const editButton = birdList.getElementsByClassName('edit-button')[0];
    const loadButton = birdList.getElementsByClassName('load-button')[0];

    if (birdList.id == 'default-list') {
      birdList.addEventListener('click', () => {
        console.log(`On choisit la liste par défaut`);
      });
    } else {
      birdList.addEventListener('click', () => {
        console.log(`On choisit la liste ${birdList.id}`);
      });
    }
  }
  
};


