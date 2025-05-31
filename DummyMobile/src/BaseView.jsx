import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

type BaseViewProps = {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
};

const BaseView: React.FC<BaseViewProps> = () => {
    return (
        <View >
            <h1>
                This is the page 
            </h1>
        </View>
    );
};

export default BaseView;