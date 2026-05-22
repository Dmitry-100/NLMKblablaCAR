import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '../../components/ui';
import { LocationInput } from '../../components/LocationInput';
import { MapPicker } from '../../components/MapPicker';
import { LocationData } from '../../services/yandexMapsService';
import { City, Trip } from '../../types';

interface EditTripModalProps {
  trip: Trip;
  onSave: (trip: Trip) => Promise<void>;
  onClose: () => void;
}

export function EditTripModal({ trip, onSave, onClose }: EditTripModalProps) {
  const [editData, setEditData] = useState<Trip>(trip);
  const [isSaving, setIsSaving] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState<{
    type: 'pickup' | 'dropoff';
    city: City;
    initialLocation?: LocationData;
  } | null>(null);
  const passengerSeats = Math.min(3, Math.max(1, (editData.seatsTotal ?? 4) - 1));

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(editData);
    setIsSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="app-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border p-6 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[color:var(--app-text)]">
              Редактировать поездку
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--app-text)]">
                Дата
              </label>
              <input
                type="date"
                value={editData.date}
                onChange={e => setEditData({ ...editData, date: e.target.value })}
                className="industrial-input p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--app-text)]">
                Время
              </label>
              <input
                type="time"
                value={editData.time}
                onChange={e => setEditData({ ...editData, time: e.target.value })}
                className="industrial-input p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--app-text)]">
                Свободных мест
              </label>
              <select
                value={passengerSeats}
                onChange={e => setEditData({ ...editData, seatsTotal: Number(e.target.value) + 1 })}
                className="industrial-input p-3"
              >
                <option value={1}>1 место</option>
                <option value={2}>2 места</option>
                <option value={3}>3 места</option>
              </select>
              <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">
                Укажите число пассажирских мест (без водителя).
              </p>
            </div>

            <LocationInput
              value={editData.pickupLocation}
              onChange={loc =>
                setEditData({
                  ...editData,
                  pickupLocation: loc.address,
                  pickupLat: loc.lat,
                  pickupLng: loc.lng,
                })
              }
              city={editData.from}
              placeholder="Место посадки"
              label="Место посадки"
              onOpenMap={() =>
                setMapPickerOpen({
                  type: 'pickup',
                  city: editData.from,
                  initialLocation: editData.pickupLocation
                    ? {
                        address: editData.pickupLocation,
                        lat: editData.pickupLat,
                        lng: editData.pickupLng,
                      }
                    : undefined,
                })
              }
            />

            <LocationInput
              value={editData.dropoffLocation}
              onChange={loc =>
                setEditData({
                  ...editData,
                  dropoffLocation: loc.address,
                  dropoffLat: loc.lat,
                  dropoffLng: loc.lng,
                })
              }
              city={editData.to}
              placeholder="Место высадки"
              label="Место высадки"
              onOpenMap={() =>
                setMapPickerOpen({
                  type: 'dropoff',
                  city: editData.to,
                  initialLocation: editData.dropoffLocation
                    ? {
                        address: editData.dropoffLocation,
                        lat: editData.dropoffLat,
                        lng: editData.dropoffLng,
                      }
                    : undefined,
                })
              }
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--app-text)]">
                Комментарий
              </label>
              <textarea
                value={editData.comment}
                onChange={e => setEditData({ ...editData, comment: e.target.value })}
                className="industrial-input resize-none p-3"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSave} loading={isSaving} className="flex-1">
              <Save size={18} /> Сохранить
            </Button>
          </div>
        </div>
      </div>

      {mapPickerOpen && (
        <MapPicker
          isOpen={true}
          onClose={() => setMapPickerOpen(null)}
          city={mapPickerOpen.city}
          initialLocation={mapPickerOpen.initialLocation}
          onSelect={location => {
            if (mapPickerOpen.type === 'pickup') {
              setEditData({
                ...editData,
                pickupLocation: location.address,
                pickupLat: location.lat,
                pickupLng: location.lng,
              });
            } else {
              setEditData({
                ...editData,
                dropoffLocation: location.address,
                dropoffLat: location.lat,
                dropoffLng: location.lng,
              });
            }
            setMapPickerOpen(null);
          }}
        />
      )}
    </>
  );
}
