from .models import Notification


# Each audience has (title, message) per language; {place} is the place title.
BOOKING_COPY = {
    'booking_created': {
        'client': {
            'ru': ('Бронирование создано', 'Ваша заявка на «{place}» создана и ожидает обработки.'),
            'uz': ('Bron yaratildi', '«{place}» uchun arizangiz yaratildi va ko\'rib chiqilmoqda.'),
            'en': ('Booking created', 'Your request for {place} has been created and is awaiting processing.'),
        },
        'owner': {
            'ru': ('Новая бронь', 'По объекту «{place}» создана новая заявка на бронирование.'),
            'uz': ('Yangi bron', '«{place}» joyi uchun yangi bron arizasi yaratildi.'),
            'en': ('New booking', 'A new booking request was created for {place}.'),
        },
    },
    'booking_paid': {
        'client': {
            'ru': ('Оплата принята', 'Тестовая оплата бронирования «{place}» успешно проведена.'),
            'uz': ('To\'lov qabul qilindi', '«{place}» broni uchun test to\'lovi muvaffaqiyatli o\'tdi.'),
            'en': ('Payment received', 'The test payment for your booking of {place} was successful.'),
        },
        'owner': {
            'ru': ('Бронь оплачена', 'Бронирование объекта «{place}» оплачено через тестового провайдера.'),
            'uz': ('Bron to\'landi', '«{place}» joyining broni test provayderi orqali to\'landi.'),
            'en': ('Booking paid', 'The booking of {place} was paid through the test provider.'),
        },
    },
    'booking_confirmed': {
        'client': {
            'ru': ('Бронирование подтверждено', 'Бронирование «{place}» подтверждено.'),
            'uz': ('Bron tasdiqlandi', '«{place}» broni tasdiqlandi.'),
            'en': ('Booking confirmed', 'Your booking of {place} is confirmed.'),
        },
        'owner': {
            'ru': ('Бронь подтверждена', 'Бронирование объекта «{place}» подтверждено.'),
            'uz': ('Bron tasdiqlandi', '«{place}» joyining broni tasdiqlandi.'),
            'en': ('Booking confirmed', 'The booking of {place} is confirmed.'),
        },
    },
    'booking_cancelled': {
        'client': {
            'ru': ('Бронирование отменено', 'Бронирование «{place}» отменено.'),
            'uz': ('Bron bekor qilindi', '«{place}» broni bekor qilindi.'),
            'en': ('Booking cancelled', 'Your booking of {place} was cancelled.'),
        },
        'owner': {
            'ru': ('Бронь отменена', 'Бронирование объекта «{place}» отменено.'),
            'uz': ('Bron bekor qilindi', '«{place}» joyining broni bekor qilindi.'),
            'en': ('Booking cancelled', 'The booking of {place} was cancelled.'),
        },
    },
    'booking_blocked': {
        'client': {
            'ru': ('Период заблокирован', 'Период по объекту «{place}» заблокирован.'),
            'uz': ('Davr yopildi', '«{place}» joyi bo\'yicha davr yopildi.'),
            'en': ('Period closed', 'A period for {place} has been closed.'),
        },
        'owner': {
            'ru': ('Период заблокирован', 'Период по объекту «{place}» добавлен в календарь как заблокированный.'),
            'uz': ('Davr yopildi', '«{place}» joyi bo\'yicha davr taqvimga yopiq deb qo\'shildi.'),
            'en': ('Period closed', 'A period for {place} was added to the calendar as closed.'),
        },
    },
}


def create_system_notification(
    *,
    user,
    notification_type,
    title_ru,
    message_ru,
    title_uz='',
    title_en='',
    message_uz='',
    message_en='',
    related_place_id=None,
    related_booking_id=None,
    related_tariff_subscription_id=None,
):
    if not user:
        return None
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title_ru=title_ru,
        title_uz=title_uz,
        title_en=title_en,
        message_ru=message_ru,
        message_uz=message_uz,
        message_en=message_en,
        related_place_id=related_place_id,
        related_booking_id=related_booking_id,
        related_tariff_subscription_id=related_tariff_subscription_id,
    )


def notify_booking_event(booking, notification_type, actor=None, include_actor=False):
    if notification_type not in BOOKING_COPY:
        raise ValueError(f'Unsupported booking notification type: {notification_type}')

    place = booking.place
    candidates = (
        ('client', booking.client),
        ('owner', place.owner),
    )
    created_for = set()
    notifications = []
    for audience, recipient in candidates:
        if not recipient or recipient.id in created_for:
            continue
        if actor and recipient.id == actor.id and not include_actor:
            continue
        copy = BOOKING_COPY[notification_type][audience]
        notifications.append(create_system_notification(
            user=recipient,
            notification_type=notification_type,
            title_ru=copy['ru'][0],
            title_uz=copy['uz'][0],
            title_en=copy['en'][0],
            message_ru=copy['ru'][1].format(place=place.title),
            message_uz=copy['uz'][1].format(place=place.title),
            message_en=copy['en'][1].format(place=place.title),
            related_place_id=place.id,
            related_booking_id=booking.id,
        ))
        created_for.add(recipient.id)
    return notifications


def notify_tariff_activated(subscription):
    tariff_name = subscription.tariff.name if subscription.tariff else 'Joyzone'
    return create_system_notification(
        user=subscription.partner,
        notification_type='tariff_activated',
        title_ru='Тариф активирован',
        title_uz='Tarif faollashtirildi',
        title_en='Plan activated',
        message_ru=f'Тариф «{tariff_name}» активирован и доступен в кабинете партнёра.',
        message_uz=f"«{tariff_name}» tarifi faollashtirildi va e'lonlar kabinetida mavjud.",
        message_en=f'The {tariff_name} plan is active and available in your partner cabinet.',
        related_tariff_subscription_id=subscription.id,
    )
