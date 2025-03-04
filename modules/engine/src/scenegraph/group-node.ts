import {Matrix4, Vector3} from '@math.gl/core';
import {log} from '@luma.gl/core';
import {ScenegraphNode, ScenegraphNodeProps} from './scenegraph-node';

export type GroupNodeProps = ScenegraphNodeProps & {
  children?: ScenegraphNode[];
}

export class GroupNode extends ScenegraphNode {
  children: ScenegraphNode[];

  constructor(children: ScenegraphNode[]);
  constructor(props?: GroupNodeProps);

  constructor(props: ScenegraphNode[] | GroupNodeProps = {}) {
    props = Array.isArray(props) ? {children: props} : props;
    const {children = []} = props;
    log.assert(
      children.every((child) => child instanceof ScenegraphNode),
      'every child must an instance of ScenegraphNode'
    );
    super(props);
    this.children = children;
  }

  override getBounds(): [number[], number[]] | null {
    const result: [number[], number[]] = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];

    this.traverse((node, {worldMatrix}) => {
      const bounds = node.getBounds();
      if (!bounds) {
        return;
      }
      const [min, max] = bounds;
      const center = new Vector3(min).add(max).divide([2, 2, 2]);
      worldMatrix.transformAsPoint(center, center);
      const halfSize = new Vector3(max).subtract(min).divide([2, 2, 2]);
      worldMatrix.transformAsVector(halfSize, halfSize);

      for (let v = 0; v < 8; v++) {
        // Test all 8 corners of the box
        const position = new Vector3(
          v & 0b001 ? -1 : 1,
          v & 0b010 ? -1 : 1,
          v & 0b100 ? -1 : 1
        ).multiply(halfSize).add(center);

        for (let i = 0; i < 3; i++) {
          result[0][i] = Math.min(result[0][i], position[i]);
          result[1][i] = Math.max(result[1][i], position[i]);
        }
      }
    });
    if (!Number.isFinite(result[0][0])) {
      return null;
    }
    return result;
  }

  override destroy(): void {
    this.children.forEach((child) => child.destroy());
    this.removeAll();
    super.destroy();
  }

  // Unpacks arrays and nested arrays of children
  add(...children: (ScenegraphNode | ScenegraphNode[])[]): this {
    for (const child of children) {
      if (Array.isArray(child)) {
        this.add(...child);
      } else {
        this.children.push(child);
      }
    }
    return this;
  }

  remove(child: ScenegraphNode): this {
    const children = this.children;
    const indexOf = children.indexOf(child);
    if (indexOf > -1) {
      children.splice(indexOf, 1);
    }
    return this;
  }

  removeAll(): this {
    this.children = [];
    return this;
  }

  traverse(visitor: (node: ScenegraphNode, context: {worldMatrix: Matrix4}) => void, {worldMatrix = new Matrix4()} = {}) {
    const modelMatrix = new Matrix4(worldMatrix).multiplyRight(this.matrix);

    for (const child of this.children) {
      if (child instanceof GroupNode) {
        child.traverse(visitor, {worldMatrix: modelMatrix});
      } else {
        visitor(child, {worldMatrix: modelMatrix});
      }
    }
  }
}
