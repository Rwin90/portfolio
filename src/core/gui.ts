import LIL from "lil-gui";

export class Gui {
  gui: LIL;

  constructor() {
    this.gui = new LIL({ width: 320, closeFolders: true });
  }

  folder(name: string) {
    return this.gui.addFolder(name);
  }

  add(target: any, prop: string, ...args: any[]) {
    return this.gui.add(target, prop, ...args);
  }

  addColor(target: any, prop: string) {
    return this.gui.addColor(target, prop);
  }
}
