#!/usr/bin/env python3
"""
Repository Organization Script
Скрипт для организации файлов репозитория

Возможности:
- Создание структуры папок по типам файлов
- Перемещение файлов с поддержкой undo через manifest.json
- Режим dry-run для предпросмотра изменений
- Настраиваемые паттерны для классификации файлов
- Архивация с исключениями ключевых папок
- Логирование в scripts/organize_repo.log
"""

import os
import shutil
import json
import zipfile
import argparse
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import re


class RepositoryOrganizer:
    """Класс для организации файлов в репозитории"""
    
    DEFAULT_PATTERNS = {
        'documentation': {
            'patterns': [r'\.md$', r'\.txt$', r'\.rst$', r'\.adoc$'],
            'folder': 'docs'
        },
        'configuration': {
            'patterns': [r'\.json$', r'\.yml$', r'\.yaml$', r'\.toml$', r'\.ini$', r'\.cfg$', r'\.conf$'],
            'folder': 'config'
        },
        'scripts': {
            'patterns': [r'\.py$', r'\.sh$', r'\.ps1$', r'\.bat$', r'\.cmd$'],
            'folder': 'scripts'
        },
        'frontend': {
            'patterns': [r'\.html$', r'\.css$', r'\.js$', r'\.ts$', r'\.tsx$', r'\.jsx$', r'\.vue$'],
            'folder': 'frontend'
        },
        'images': {
            'patterns': [r'\.png$', r'\.jpg$', r'\.jpeg$', r'\.gif$', r'\.svg$', r'\.ico$'],
            'folder': 'assets/images'
        },
        'data': {
            'patterns': [r'\.csv$', r'\.xml$', r'\.sql$', r'\.db$', r'\.sqlite$'],
            'folder': 'data'
        }
    }
    
    EXCLUDE_PATTERNS = [
        r'\.git.*',
        r'node_modules.*',
        r'__pycache__.*',
        r'\.venv.*',
        r'venv.*',
        r'\.pytest_cache.*',
        r'\.coverage.*',
        r'dist.*',
        r'build.*'
    ]
    
    # Защищенные папки, которые не перемещаются
    PROTECTED_FOLDERS = [
        '.git', 'ui', 'server', 'infra', 'docs', 'ARTIFACTS', 'workspace', 'scripts'
    ]
    
    def __init__(self, base_path: str, patterns: Dict = None, exclude_patterns: List[str] = None, archive_dir: str = None):
        """
        Инициализация организатора
        
        Args:
            base_path: Базовый путь к репозиторию
            patterns: Словарь паттернов для классификации файлов
            exclude_patterns: Список паттернов для исключения
            archive_dir: Папка для архивирования (по умолчанию workspace/archived_files)
        """
        self.base_path = Path(base_path).resolve()
        self.patterns = patterns or self.DEFAULT_PATTERNS
        self.exclude_patterns = exclude_patterns or self.EXCLUDE_PATTERNS
        self.archive_dir = Path(archive_dir) if archive_dir else self.base_path / "workspace" / "archived_files"
        self.operations_log = []
        self.logger = self._setup_logger()
        self.log_file = self.base_path / "scripts" / "organize_repo.log"
        
    def _setup_logger(self) -> logging.Logger:
        """Настройка логгера"""
        logger = logging.getLogger('repo_organizer')
        logger.setLevel(logging.INFO)
        
        # Создаем папку scripts если не существует
        scripts_dir = self.base_path / "scripts"
        scripts_dir.mkdir(exist_ok=True)
        
        # File handler
        file_handler = logging.FileHandler(scripts_dir / "organize_repo.log", encoding='utf-8')
        file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        return logger
    
    def _should_exclude(self, path: Path) -> bool:
        """
        Проверка, нужно ли исключить файл/папку
        
        Args:
            path: Путь для проверки
            
        Returns:
            True если нужно исключить
        """
        relative_path = path.relative_to(self.base_path)
        path_str = str(relative_path)
        
        # Проверяем защищенные папки
        for protected in self.PROTECTED_FOLDERS:
            if path_str.startswith(protected):
                return True
        
        # Проверяем паттерны исключения
        for pattern in self.exclude_patterns:
            if re.search(pattern, path_str, re.IGNORECASE):
                return True
        return False
    
    def _classify_file(self, file_path: Path) -> Tuple[str, str]:
        """
        Классификация файла по типу
        
        Args:
            file_path: Путь к файлу
            
        Returns:
            Кортеж (тип_файла, папка_назначения)
        """
        filename = file_path.name
        
        for file_type, config in self.patterns.items():
            for pattern in config['patterns']:
                if re.search(pattern, filename, re.IGNORECASE):
                    return file_type, config['folder']
        
        return 'misc', 'misc'
    
    def _scan_files(self) -> Dict[str, List[Path]]:
        """
        Сканирование файлов в репозитории
        
        Returns:
            Словарь с файлами, сгруппированными по типам
        """
        files_by_type = {}
        
        for root, dirs, files in os.walk(self.base_path):
            root_path = Path(root)
            
            # Исключаем папки
            dirs[:] = [d for d in dirs if not self._should_exclude(root_path / d)]
            
            if self._should_exclude(root_path):
                continue
                
            for file in files:
                file_path = root_path / file
                
                if self._should_exclude(file_path):
                    continue
                
                file_type, target_folder = self._classify_file(file_path)
                
                if file_type not in files_by_type:
                    files_by_type[file_type] = []
                
                files_by_type[file_type].append(file_path)
        
        return files_by_type
    
    def plan_organization(self) -> Dict[str, Dict]:
        """
        Планирование организации файлов
        
        Returns:
            План организации с подробной информацией
        """
        files_by_type = self._scan_files()
        plan = {}
        
        for file_type, files in files_by_type.items():
            target_folder = self.patterns.get(file_type, {}).get('folder', 'misc')
            target_path = self.archive_dir / target_folder
            
            plan[file_type] = {
                'files': files,
                'target_folder': target_folder,
                'target_path': target_path,
                'count': len(files)
            }
        
        return plan
    
    def preview_changes(self) -> str:
        """
        Предварительный просмотр изменений
        
        Returns:
            Строка с описанием планируемых изменений
        """
        plan = self.plan_organization()
        preview = ["=" * 60]
        preview.append("PREVIEW: Планируемые изменения")
        preview.append("=" * 60)
        preview.append(f"Архивная папка: {self.archive_dir}")
        preview.append("")
        
        total_files = 0
        for file_type, info in plan.items():
            count = info['count']
            target = info['target_folder']
            total_files += count
            
            preview.append(f"{file_type.upper()}: {count} файлов → {target}/")
            
            for file_path in info['files'][:5]:  # Показываем первые 5 файлов
                relative_path = file_path.relative_to(self.base_path)
                preview.append(f"  • {relative_path}")
            
            if count > 5:
                preview.append(f"  ... и ещё {count - 5} файлов")
            preview.append("")
        
        preview.append(f"ВСЕГО: {total_files} файлов будет перемещено в {self.archive_dir}")
        preview.append("=" * 60)
        
        return "\n".join(preview)
    
    def organize_files(self, dry_run: bool = False) -> bool:
        """
        Организация файлов согласно плану
        
        Args:
            dry_run: Если True, только показывает что будет сделано
            
        Returns:
            True если операция успешна
        """
        plan = self.plan_organization()
        
        if dry_run:
            print(self.preview_changes())
            return True
        
        self.logger.info("Начинаем организацию файлов...")
        
        # Создаем архивную папку
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        for file_type, info in plan.items():
            target_path = self.archive_dir / info['target_folder']
            
            # Создаем целевую папку
            target_path.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"Создана папка: {target_path}")
            
            for file_path in info['files']:
                try:
                    # Определяем новый путь
                    new_path = target_path / file_path.name
                    
                    # Если файл с таким именем уже существует, добавляем суффикс
                    counter = 1
                    while new_path.exists():
                        stem = file_path.stem
                        suffix = file_path.suffix
                        new_path = target_path / f"{stem}_{counter}{suffix}"
                        counter += 1
                    
                    # Перемещаем файл
                    shutil.move(str(file_path), str(new_path))
                    
                    # Записываем операцию для возможного отката
                    operation = {
                        'action': 'move',
                        'from': str(file_path),
                        'to': str(new_path),
                        'timestamp': datetime.now().isoformat(),
                        'file_type': file_type
                    }
                    self.operations_log.append(operation)
                    
                    self.logger.info(f"Перемещен: {file_path.name} → {target_path}")
                    
                except Exception as e:
                    self.logger.error(f"Ошибка при перемещении {file_path}: {e}")
                    return False
        
        # Сохраняем лог операций и создаем manifest
        self._save_operations_log()
        self._create_manifest()
        self.logger.info("Организация файлов завершена успешно!")
        
        return True
    
    def _save_operations_log(self):
        """Сохранение лога операций для возможного отката"""
        log_file = self.archive_dir / f"operations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self.operations_log, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Лог операций сохранен: {log_file}")
    
    def _create_manifest(self):
        """Создание manifest.json с информацией о перемещениях"""
        manifest = {
            'timestamp': datetime.now().isoformat(),
            'total_operations': len(self.operations_log),
            'git_status': self._get_git_status(),
            'operations': self.operations_log
        }
        
        manifest_file = self.archive_dir / "manifest.json"
        with open(manifest_file, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Manifest создан: {manifest_file}")
    
    def _get_git_status(self) -> Optional[str]:
        """Получение git status если доступен"""
        try:
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True, cwd=self.base_path)
            if result.returncode == 0:
                return result.stdout
        except Exception:
            pass
        return None
    
    def undo_organization_from_manifest(self, manifest_file: str) -> bool:
        """
        Отмена организации по manifest.json
        
        Args:
            manifest_file: Путь к файлу manifest.json
            
        Returns:
            True если операция успешна
        """
        try:
            with open(manifest_file, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            operations = manifest.get('operations', [])
            self.logger.info(f"Начинаем отмену организации из {len(operations)} операций...")
            
            # Выполняем операции в обратном порядке
            for operation in reversed(operations):
                if operation['action'] == 'move':
                    from_path = Path(operation['to'])
                    to_path = Path(operation['from'])
                    
                    if from_path.exists():
                        # Создаем папку назначения если нужно
                        to_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(from_path), str(to_path))
                        self.logger.info(f"Восстановлен: {from_path.name} → {to_path}")
            
            self.logger.info("Отмена организации завершена успешно!")
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка при отмене организации: {e}")
            return False


def main():
    """Главная функция для CLI интерфейса"""
    parser = argparse.ArgumentParser(description='Организация файлов репозитория')
    
    parser.add_argument('path', nargs='?', default='.', help='Путь к репозиторию (по умолчанию текущая папка)')
    parser.add_argument('--dry-run', action='store_true', help='Предварительный просмотр изменений (по умолчанию)')
    parser.add_argument('--apply', action='store_true', help='Выполнить организацию файлов')
    parser.add_argument('--undo', help='Отменить организацию (путь к manifest.json)')
    parser.add_argument('--archive-dir', help='Папка для архивирования (по умолчанию workspace/archived_files)')
    parser.add_argument('--patterns', help='JSON файл с пользовательскими паттернами')
    
    args = parser.parse_args()
    
    # Загрузка пользовательских паттернов
    patterns = None
    if args.patterns:
        with open(args.patterns, 'r', encoding='utf-8') as f:
            patterns = json.load(f)
    
    organizer = RepositoryOrganizer(args.path, patterns, archive_dir=args.archive_dir)
    
    if args.undo:
        organizer.undo_organization_from_manifest(args.undo)
    elif args.apply:
        organizer.organize_files(dry_run=False)
    else:
        # По умолчанию показываем предварительный просмотр (dry-run)
        organizer.organize_files(dry_run=True)


if __name__ == '__main__':
    main()
