import { useState, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

interface Coords {
    latitude: number;
    longitude: number;
}

export const useGpsLocation = () => {
    const [location, setLocation] = useState<Coords | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const requestLocationPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'ios') {
            const status = await Geolocation.requestAuthorization('whenInUse');
            return status === 'granted';
        }

        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Permissão de Localização",
                        message: "Precisamos da sua localização para demarcar piquetes.",
                        buttonNeutral: "Perguntar Depois",
                        buttonNegative: "Cancelar",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return false;
    };

    useEffect(() => {
        const watchId = Geolocation.watchPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error(err);
                setError("Não foi possível obter a localização. Verifique o GPS.");
                setLoading(false);
            },
            {
                enableHighAccuracy: true, 
                distanceFilter: 5,
                interval: 3000,
                fastestInterval: 1000,
            }
        );

        requestLocationPermission().then(granted => {
            if (!granted) {
                setError("Permissão de localização negada.");
                setLoading(false);
            }
        });

        return () => {
            if (watchId) {
                Geolocation.clearWatch(watchId);
            }
        };
    }, []);

    return { location, error, loading };
};