import React from 'react';
import VrViewer from './VrViewer';

export interface PannellumViewerProps {
    images: string[];
    activeIndex: number;
    onSceneChange?: (idx: number) => void;
    height?: string;
    title?: string;
    address?: string;
    thumbnail?: string;
}

const PannellumViewer: React.FC<PannellumViewerProps> = (props) => {
    return <VrViewer {...props} />;
};

export { PannellumViewer };
export default PannellumViewer;
