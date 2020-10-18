import create from 'zustand';
import { api, env, logger, reactors, stage } from 'global';
import { updateCanvas } from 'actions/stage';
import { loadScenes, resetScenes } from 'actions/scenes';
import { loadReactors, resetReactors } from 'actions/reactors';
import { raiseError } from 'actions/error';
import { showModal } from 'actions/modals';
import Entity from 'core/Entity';
import Stage from 'core/Stage';
import Scene from 'core/Scene';
import Display from 'core/Display';
import AudioReactor from 'audio/AudioReactor';
import * as displays from 'displays';
import * as effects from 'effects';
import {
  DEFAULT_CANVAS_BGCOLOR,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
} from 'view/constants';

const initialState = {
  file: '',
  opened: 0,
  lastModified: 0,
};

const projectStore = create(() => ({
  ...initialState,
}));

export function touchProject() {
  projectStore.setState({ lastModified: Date.now() });
}

export function resetProject() {
  projectStore.setState({ ...initialState });
}

function loadElement(scene, config) {
  const { name } = config;
  const type = displays[name] || effects[name];

  if (type) {
    const entity = Display.create(type, config);

    scene.addElement(entity);
  } else {
    logger.warn('Component not found:', name);
  }
}

export function loadProject(data) {
  logger.log('Loaded project:', data);

  resetScenes(false);
  resetReactors();

  if (data.reactors) {
    data.reactors.forEach(config => {
      const reactor = Entity.create(AudioReactor, config);

      reactors.addReactor(reactor);
    });
  }

  if (data.scenes) {
    data.scenes.forEach(config => {
      const scene = Display.create(Scene, config);

      stage.addScene(scene);

      if (config.displays) {
        config.displays.forEach(display => loadElement(scene, display));
      }

      if (config.effects) {
        config.effects.forEach(effect => loadElement(scene, effect));
      }
    });
  }

  if (data.stage) {
    stage.update(data.stage.properties);
  } else {
    stage.update(Stage.defaultProperties);
  }
}

export async function newProject() {
  await resetScenes();
  await resetReactors();
  await updateCanvas(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_BGCOLOR);

  const scene = stage.addScene();

  scene.addElement(new displays.ImageDisplay());
  scene.addElement(new displays.BarSpectrumDisplay());
  scene.addElement(new displays.TextDisplay());

  await loadScenes();
  await loadReactors();
  await resetProject();
}

export function checkUnsavedChanges(menuAction, action) {
  const { opened, lastModified } = projectStore.getState();

  if (lastModified > opened) {
    showModal('UnsavedChangesDialog', { showCloseButton: false }, { action: menuAction });
  } else {
    action();
  }
}

export async function loadProjectFile(file) {
  try {
    const data = await api.loadProjectFile(file);

    await loadProject(data);
    await loadScenes();
    await projectStore.setState({ file, opened: Date.now(), lastModified: 0 });
  } catch (e) {
    return raiseError('Invalid project file.', e);
  }
}

export async function saveProjectFile(file) {
  if (file) {
    const data = {
      version: env.APP_VERSION,
      stage: stage.toJSON(),
      scenes: stage.scenes.toJSON(),
      reactors: reactors.toJSON(),
    };

    try {
      await api.saveProjectFile(file, data);

      logger.log('Project saved:', file, data);

      projectStore.setState({ file, lastModified: 0 });

      return true;
    } catch (error) {
      raiseError('Failed to save project file.', error);
    }
  } else {
    const { filePath, canceled } = await api.showSaveDialog({ defaultPath: 'project.afx' });

    if (!canceled) {
      await saveProjectFile(filePath);
    }
  }

  return false;
}

export async function openProjectFile() {
  const { filePaths, canceled } = await api.showOpenDialog({
    filters: [{ name: 'Project files', extensions: ['afx'] }],
  });

  if (!canceled) {
    loadProjectFile(filePaths[0]);
  }
}

export default projectStore;
