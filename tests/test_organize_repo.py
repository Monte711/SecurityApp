#!/usr/bin/env python3
"""
Unit tests для organize_repo.py
"""

import unittest
import tempfile
import shutil
import json
import logging
from pathlib import Path
import sys
import os

# Добавляем scripts в path для импорта
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from organize_repo import RepositoryOrganizer


class TestRepositoryOrganizer(unittest.TestCase):
    """Тесты для RepositoryOrganizer"""
    
    def setUp(self):
        """Подготовка тестового окружения"""
        self.test_dir = Path(tempfile.mkdtemp())
        self.organizer = RepositoryOrganizer(str(self.test_dir))
        
        # Создаем тестовые файлы
        self.test_files = {
            'test.py': 'scripts',
            'readme.md': 'docs', 
            'config.json': 'config',
            'style.css': 'frontend',
            'image.png': 'assets/images',
            'data.csv': 'data',
            'unknown.xyz': 'misc'
        }
        
        for filename in self.test_files.keys():
            test_file = self.test_dir / filename
            test_file.write_text('test content', encoding='utf-8')
    
    def tearDown(self):
        """Очистка после тестов"""
        # Закрываем все логгеры перед удалением
        logger = logging.getLogger('repo_organizer')
        for handler in logger.handlers[:]:
            handler.close()
            logger.removeHandler(handler)
            
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_dry_run_output(self):
        """Тест dry-run режима"""
        result = self.organizer.organize_files(dry_run=True)
        self.assertTrue(result)
        
        # Проверяем что файлы остались на месте
        for filename in self.test_files.keys():
            self.assertTrue((self.test_dir / filename).exists())
    
    def test_file_classification(self):
        """Тест классификации файлов"""
        plan = self.organizer.plan_organization()
        
        # Проверяем правильность классификации по именам файлов
        found_files = {}
        for file_type, info in plan.items():
            for file_path in info['files']:
                found_files[file_path.name] = file_type
        
        expected_mapping = {
            'test.py': 'scripts',
            'readme.md': 'documentation', 
            'config.json': 'configuration',
            'style.css': 'frontend',
            'image.png': 'images',
            'data.csv': 'data',
            'unknown.xyz': 'misc'
        }
        
        for filename, expected_type in expected_mapping.items():
            self.assertIn(filename, found_files, f"Файл {filename} не найден")
            self.assertEqual(found_files[filename], expected_type, 
                           f"Файл {filename} классифицирован как {found_files[filename]}, ожидался {expected_type}")
    
    def test_organize_and_manifest(self):
        """Тест организации файлов и создания manifest"""
        # Выполняем организацию
        result = self.organizer.organize_files(dry_run=False)
        self.assertTrue(result)
        
        # Проверяем что manifest создан
        manifest_file = self.organizer.archive_dir / "manifest.json"
        self.assertTrue(manifest_file.exists())
        
        # Проверяем содержимое manifest
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        self.assertIn('timestamp', manifest)
        self.assertIn('total_operations', manifest)
        self.assertIn('operations', manifest)
        self.assertEqual(manifest['total_operations'], len(self.test_files))
        
        # Проверяем что файлы перемещены
        for filename, folder in self.test_files.items():
            original_path = self.test_dir / filename
            target_path = self.organizer.archive_dir / folder / filename
            
            self.assertFalse(original_path.exists(), f"Файл {filename} не был перемещен")
            self.assertTrue(target_path.exists(), f"Файл {filename} не найден в {folder}")
    
    def test_undo_organization(self):
        """Тест отмены организации"""
        # Сначала организуем файлы
        result = self.organizer.organize_files(dry_run=False)
        self.assertTrue(result)
        
        # Проверяем что файлы перемещены
        for filename in self.test_files.keys():
            original_path = self.test_dir / filename
            self.assertFalse(original_path.exists())
        
        # Отменяем организацию
        manifest_file = self.organizer.archive_dir / "manifest.json"
        result = self.organizer.undo_organization_from_manifest(str(manifest_file))
        self.assertTrue(result)
        
        # Проверяем что файлы восстановлены
        for filename in self.test_files.keys():
            original_path = self.test_dir / filename
            self.assertTrue(original_path.exists(), f"Файл {filename} не восстановлен")
    
    def test_protected_folders(self):
        """Тест защиты важных папок"""
        # Создаем защищенные папки
        protected_folders = ['.git', 'ui', 'server']  # убираем scripts так как он уже создан
        for folder in protected_folders:
            folder_path = self.test_dir / folder
            folder_path.mkdir(exist_ok=True)
            (folder_path / 'test_file.txt').write_text('test')
        
        # Выполняем организацию
        result = self.organizer.organize_files(dry_run=False)
        self.assertTrue(result)
        
        # Проверяем что защищенные папки остались на месте
        for folder in protected_folders:
            folder_path = self.test_dir / folder
            self.assertTrue(folder_path.exists(), f"Защищенная папка {folder} была перемещена")
            self.assertTrue((folder_path / 'test_file.txt').exists())
    
    def test_custom_patterns(self):
        """Тест пользовательских паттернов"""
        custom_patterns = {
            'logs': {
                'patterns': [r'\.log$'],
                'folder': 'logs'
            }
        }
        
        organizer = RepositoryOrganizer(str(self.test_dir), patterns=custom_patterns)
        
        # Создаем тестовый файл
        log_file = self.test_dir / 'test.log'
        log_file.write_text('log content')
        
        plan = organizer.plan_organization()
        self.assertIn('logs', plan)
        self.assertEqual(len(plan['logs']['files']), 1)


class TestIntegration(unittest.TestCase):
    """Интеграционные тесты"""
    
    def test_full_workflow(self):
        """Тест полного рабочего процесса"""
        with tempfile.TemporaryDirectory() as temp_dir:
            test_dir = Path(temp_dir)
            
            # Создаем структуру файлов
            files_to_create = [
                'README.md',
                'config.yml', 
                'script.py',
                'styles.css',
                'logo.png',
                'data.json'
            ]
            
            for filename in files_to_create:
                (test_dir / filename).write_text(f'Content of {filename}')
            
            organizer = RepositoryOrganizer(str(test_dir))
            
            # 1. Dry-run
            dry_result = organizer.organize_files(dry_run=True)
            self.assertTrue(dry_result)
            
            # Проверяем что файлы не перемещены
            for filename in files_to_create:
                self.assertTrue((test_dir / filename).exists())
            
            # 2. Организация
            org_result = organizer.organize_files(dry_run=False)
            self.assertTrue(org_result)
            
            # Проверяем что архивная папка создана
            self.assertTrue(organizer.archive_dir.exists())
            
            # 3. Undo
            manifest_file = organizer.archive_dir / "manifest.json"
            self.assertTrue(manifest_file.exists())
            
            undo_result = organizer.undo_organization_from_manifest(str(manifest_file))
            self.assertTrue(undo_result)
            
            # Проверяем что файлы восстановлены
            for filename in files_to_create:
                self.assertTrue((test_dir / filename).exists())


if __name__ == '__main__':
    unittest.main()
