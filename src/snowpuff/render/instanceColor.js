/** The per-instance colour of an InstancedMesh with setColorAt (the varying three sets up). */
import { varyingProperty } from 'three/tsl';

export const instanceColor = () => varyingProperty('vec3', 'vInstanceColor');
