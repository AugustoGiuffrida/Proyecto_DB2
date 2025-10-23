import pymongo
from pymongo import MongoClient
from faker import Faker
import random
from datetime import datetime, time

# --- CONFIGURACIÓN ---
NUM_USUARIOS = 100
NUM_MEDIA = 500
NUM_RESEÑAS = 2000

# Listas de datos de ejemplo
GENEROS = ["Action", "Sci-Fi", "Thriller", "Comedy", "Drama", "Horror", "Romance", "Documentary"]
TIPOS_MEDIA = ["Movie", "Series"]
TIPOS_PAGO = ["Credit Card", "PayPal"]
PROVEEDORES_TARJETA = ["Visa", "MasterCard"]

def poblar_base_de_datos():
    """
    Genera y carga una gran cantidad de datos falsos consistentes
    en las colecciones 'users', 'media' y 'reviews'.
    """
    try:
        # --- 1. CONEXIÓN Y LIMPIEZA ---
        client = MongoClient('mongodb://localhost:27017/')
        db = client['MiCatalogo']
        print("Conectado a MongoDB (MiCatalogo)")

        # Obtener colecciones
        media_col = db['media']
        users_col = db['users']
        reviews_col = db['reviews']

        # Limpiar colecciones para empezar de cero
        media_col.delete_many({})
        users_col.delete_many({})
        reviews_col.delete_many({})
        print("Colecciones limpiadas.")

        fake = Faker('es_ES') # Usar Faker en español para nombres y texto

        # --- 2. GENERAR USUARIOS ---
        # Listas para guardar los IDs y datos que necesitaremos luego
        inserted_user_ids = []
        user_info_para_reviews = [] # Para denormalizar en 'reviews'
        
        print(f"Generando {NUM_USUARIOS} usuarios...")
        usuarios_para_insertar = []
        for _ in range(NUM_USUARIOS):
            username = fake.user_name()
            email = fake.email()
            avatar_url = f"https://ui-avatars.com/api/?name={username.replace(' ', '+')}&background=random"
            
            # Generamos el 'date'
            birth_date_obj = fake.date_of_birth(minimum_age=16, maximum_age=70)
            # Lo convertimos a 'datetime' combinándolo con la medianoche (time.min)
            birth_datetime_obj = datetime.combine(birth_date_obj, time.min) 
            
            user_doc = {
                "username": username,
                "email": email,
                "password_hash": fake.sha256(),
                "profile_picture_url": avatar_url,
                "createdAt": fake.date_time_between(start_date='-5y', end_date='now'),
                "personal_info": {
                    "birth_date": birth_datetime_obj, # <-- Usamos el 'datetime'
                    "country": fake.country()
                },
                "preferences": {
                    "favorite_genres": random.sample(GENEROS, k=random.randint(1, 3))
                },
                "subscription": {
                    "plan_type": random.choice(["Gratis", "Premium Mensual", "Premium Anual"]),
                    "renewal_date": fake.date_time_between(start_date='now', end_date='+1y')
                },
                "payment_methods": [{
                    "type": random.choice(TIPOS_PAGO),
                    "provider": random.choice(PROVEEDORES_TARJETA),
                    "last_four": fake.credit_card_number()[-4:],
                    "expiry": fake.credit_card_expire()
                }],
                "watchlist": [], # Se llenará al final
                "watched_list": [] # Se llenará al final
            }
            usuarios_para_insertar.append(user_doc)
            
            # Guardamos la info para las reseñas
            user_info_para_reviews.append({"username": username, "avatar_url": avatar_url})

        # Insertar todos los usuarios en lote (mucho más rápido)
        user_result = users_col.insert_many(usuarios_para_insertar)
        inserted_user_ids = user_result.inserted_ids
        print(f"Se insertaron {len(inserted_user_ids)} usuarios.")


        # --- 3. GENERAR MEDIA (Películas y Series) ---
        print(f"Generando {NUM_MEDIA} items de media...")
        media_para_insertar = []
        for _ in range(NUM_MEDIA):
            tipo = random.choice(TIPOS_MEDIA)
            media_doc = {
                "title": fake.catch_phrase(),
                "type": tipo,
                "plot": fake.paragraph(nb_sentences=4),
                "release_year": int(fake.year()),
                "poster_image": f"cover/image{random.randint(0, 8)}.jpg", # Asumiendo 9 imágenes de placeholder
                "genres": random.sample(GENEROS, k=random.randint(1, 3)),
                "rating_avg": round(random.uniform(1.0, 9.9), 1),
                "is_featured": random.choice([True, False, False]), # 1/3 de ser destacada
                "weekly_view_count": random.randint(100, 50000),
                "createdAt": fake.date_time_between(start_date='-3y', end_date='now'),
                "director": {
                    "name": fake.name()
                },
                "main_cast": [
                    {"actor_name": fake.name(), "character_name": fake.name()} for _ in range(random.randint(2, 5))
                ]
            }
            
            # Campo polimórfico: solo si es 'Series'
            if tipo == "Series":
                media_doc["seasons"] = [{
                    "season_number": s,
                    "episodes": [
                        {"episode_number": e, "title": fake.sentence(nb_words=4)} for e in range(1, random.randint(5, 12))
                    ]
                } for s in range(1, random.randint(1, 6))]
                
            media_para_insertar.append(media_doc)

        # Insertar toda la media en lote
        media_result = media_col.insert_many(media_para_insertar)
        inserted_media_ids = media_result.inserted_ids
        print(f"Se insertaron {len(inserted_media_ids)} items de media.")


        # --- 4. GENERAR RESEÑAS (Usando los IDs capturados) ---
        print(f"Generando {NUM_RESEÑAS} reseñas...")
        reseñas_para_insertar = []
        for _ in range(NUM_RESEÑAS):
            # Elegir un usuario al azar para la reseña
            idx_usuario_azar = random.randrange(0, NUM_USUARIOS)
            
            review_doc = {
                "media_id": random.choice(inserted_media_ids),  # ID consistente
                "user_id": inserted_user_ids[idx_usuario_azar], # ID consistente
                "user_info": user_info_para_reviews[idx_usuario_azar], # Datos denormalizados
                "rating": round(random.uniform(1.0, 10.0), 1),
                "comment": fake.paragraph(nb_sentences=random.randint(1, 5)),
                "createdAt": fake.date_time_between(start_date='-2y', end_date='now')
            }
            reseñas_para_insertar.append(review_doc)

        # Insertar todas las reseñas en lote
        reviews_col.insert_many(reseñas_para_insertar)
        print(f"Se insertaron {len(reseñas_para_insertar)} reseñas.")


        # --- 5. ACTUALIZAR LISTAS DE USUARIOS ---
        print(f"Actualizando watchlists y watched_lists de usuarios...")
        # (Esto es más lento porque es 1 update por usuario, pero es necesario)
        for user_id in inserted_user_ids:
            # Seleccionar N IDs de media al azar para cada lista
            num_watchlist = random.randint(0, 25)
            num_watched = random.randint(5, 70)
            
            # Usamos set() para evitar duplicados, luego list()
            try:
                watchlist_ids = list(set(random.sample(inserted_media_ids, k=num_watchlist)))
            except ValueError:
                watchlist_ids = [] # Por si num_watchlist es 0

            try:
                watched_list_ids = list(set(random.sample(inserted_media_ids, k=num_watched)))
            except ValueError:
                watched_list_ids = [] # Por si num_watched es 0
            
            users_col.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "watchlist": watchlist_ids,
                        "watched_list": watched_list_ids
                    }
                }
            )
        print(f"Se actualizaron las listas de {len(inserted_user_ids)} usuarios.")

        
        # ===============================================
        # --- 6. CREAR ÍNDICES (SECCIÓN NUEVA) ---
        # ===============================================
        print("\nCreando índices para optimizar las consultas...")

        # --- Índices para 'media' ---
        print("Creando índices para 'media'...")
        media_col.create_index([("title", "text")], name="media_title")
        media_col.create_index([("weekly_view_count", -1)], name="media_weekly_view_count")
        media_col.create_index([("createdAt", -1)], name="media_createdAt")
        media_col.create_index(
            [("genres", 1), ("type", 1), ("rating_avg", -1)],
            name="media_compound_filter"
        )

        # --- Índices para 'users' ---
        # Nota: Añadimos unique=True para asegurar que no haya emails o usernames duplicados.
        print("Creando índices para 'users'...")
        users_col.create_index([("email", 1)], name="user_email", unique=True)
        users_col.create_index([("username", 1)], name="user_name", unique=True)

        # --- Índices para 'reviews' ---
        print("Creando índices para 'reviews'...")
        reviews_col.create_index(
            [("media_id", 1), ("createdAt", -1)],
            name="review_media"
        )
        reviews_col.create_index(
            [("user_id", 1), ("createdAt", -1)],
            name="review_user"
        )
        
        print("Índices creados exitosamente.")
        
        # -----------------------------------------------

        print("\n¡Carga masiva de datos completada exitosamente!")

    except pymongo.errors.ConnectionFailure as e:
        print(f"Error de conexión: {e}")
    except Exception as e:
        print(f"Ha ocurrido un error: {e}")
    finally:
        if 'client' in locals():
            client.close()
            print("Conexión cerrada.")

# --- Ejecutar el script ---
if __name__ == "__main__":
    poblar_base_de_datos()