import json
import re

class IndexParser:
    def __init__(self, index_map):
        self.index_map = index_map

    def parse_query(self, query):
        # Используем регулярное выражение для разделения запроса на токены
        tokens = re.findall(r'\w+|\(|\)', query.lower())

        result = set()
        operator = None
        temp_result = None

        for token in tokens:
            if token == 'and':
                operator = 'and'
            elif token == 'or':
                operator = 'or'
            elif token == 'not':
                operator = 'not'
            elif token == '(':
                if temp_result is None:
                    temp_result = set()
                else:
                    temp_result = None
            elif token == ')':
                if temp_result is not None:
                    result.update(temp_result)
                    temp_result = None
            else:
                if temp_result is None:
                    temp_result = self.index_map.get(token, set())
                else:
                    if operator == 'and':
                        temp_result &= self.index_map.get(token, set())
                    elif operator == 'or':
                        temp_result |= self.index_map.get(token, set())
                    elif operator == 'not':
                        temp_result -= self.index_map.get(token, set())
                    else:
                        temp_result = self.index_map.get(token, set())
                    operator = None

        if temp_result is not None:
            result.update(temp_result)

        return result

# Открываем файл для чтения
with open('../inverted_index_2.txt', 'r') as file:
    # Считываем содержимое файла
    data = file.readlines()

# Инициализируем пустой словарь для хранения индекса
index_map = {}

# Проходим по каждой строке
for line in data:
    # Извлекаем данные из строки как объект JSON
    json_data = json.loads(line)
    # Получаем слово и массив индексов
    word = json_data['word']
    inverted_array = set(json_data['inverted_array'])
    # Сохраняем данные в инвертированный индекс
    index_map[word] = inverted_array

parser = IndexParser(index_map)

# Пример запроса
# query = "(apple AND banana) OR (banana AND orange) OR grape"

# Запрос ввода текста у пользователя
query = input("Введите текст: ")
print(query)
result = parser.parse_query(query)
print("Результат поиска:", result)
