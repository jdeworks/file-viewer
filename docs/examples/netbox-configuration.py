###################################################################
#  NetBox configuration file (configuration.py)
#  https://docs.netbox.dev/en/stable/configuration/
###################################################################

ALLOWED_HOSTS = ['netbox.example.com', '192.168.1.10', 'localhost']

DATABASE = {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': 'netbox',
    'USER': 'netbox',
    'PASSWORD': 's3cur3p@ssword!',
    'HOST': 'localhost',
    'PORT': '5432',
    'CONN_MAX_AGE': 300,
}

REDIS = {
    'tasks': {
        'HOST': 'localhost',
        'PORT': 6379,
        'USERNAME': '',
        'PASSWORD': '',
        'DATABASE': 0,
        'SSL': False,
    },
    'caching': {
        'HOST': 'localhost',
        'PORT': 6379,
        'USERNAME': '',
        'PASSWORD': '',
        'DATABASE': 1,
        'SSL': False,
    },
}

SECRET_KEY = 'q9%8_l+#v!c3x@7y$mz2p^n5w0jfke6drtuhsaoi4bg'

DEBUG = False

TIME_ZONE = 'Europe/Berlin'
LANGUAGE_CODE = 'en-us'
DATE_FORMAT = 'N j, Y'

MEDIA_ROOT = '/opt/netbox/netbox/media/'
REPORTS_ROOT = '/opt/netbox/netbox/reports/'

PLUGINS = [
    'netbox_topology_views',
    'netbox_bgp',
]

PLUGINS_CONFIG = {
    'netbox_topology_views': {
        'static_image_directory': 'netbox_topology_views/img',
        'allow_coordinates_saving': True,
        'always_save_coordinates': True,
    },
}

LOGIN_REQUIRED = True
LOGIN_TIMEOUT = None

SUPERUSERS = [
    {
        'name': 'admin',
        'email': 'admin@example.com',
        'password': 'changeme',
    },
]
