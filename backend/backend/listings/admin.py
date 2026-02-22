from django.contrib import admin

from .models import (
    AccessoriesListing,
    AgriListing,
    BoatsListing,
    BusesListing,
    BuyListing,
    CarImage,
    CarListing,
    CarListingPriceHistory,
    ListingPurchase,
    CaravanListing,
    CarsListing,
    Favorite,
    ForkliftListing,
    IndustrialListing,
    MotoListing,
    PartsListing,
    ServicesListing,
    TrailersListing,
    TrucksListing,
    WheelsListing,
)

admin.site.register(CarListing)
admin.site.register(CarImage)
admin.site.register(CarListingPriceHistory)
admin.site.register(ListingPurchase)
admin.site.register(Favorite)
admin.site.register(CarsListing)
admin.site.register(WheelsListing)
admin.site.register(PartsListing)
admin.site.register(BusesListing)
admin.site.register(TrucksListing)
admin.site.register(MotoListing)
admin.site.register(AgriListing)
admin.site.register(IndustrialListing)
admin.site.register(ForkliftListing)
admin.site.register(CaravanListing)
admin.site.register(BoatsListing)
admin.site.register(TrailersListing)
admin.site.register(AccessoriesListing)
admin.site.register(BuyListing)
admin.site.register(ServicesListing)
